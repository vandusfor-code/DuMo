import type { CommercialPlan } from "@/types/commercial-config";
import type { EquipmentCatalogItem } from "@/types/equipment";
import type {
  DiscardedEquipment,
  DiscardedPlan,
  OfferEquipmentRef,
  OfferGenerationResult,
  OfferSimulationRequest,
  PlanCommercialOffer,
} from "@/types/offer-engine";
import { PREPAID_PORTABILITY_INFO_MESSAGE } from "@/types/offer-engine";
import { getAdditionalLineUnitPrice } from "@/lib/sales-script/teleprompter/contract-pricing";

function sortPlansByCommercialOrder(plans: CommercialPlan[]): CommercialPlan[] {
  return [...plans].sort((a, b) => {
    const ao = a.commercialOrder ?? 999;
    const bo = b.commercialOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "es");
  });
}

/** Planes activos con cargo fijo real y habilitados para el motor comercial. */
export function getEvaluablePlans(allPlans: CommercialPlan[]): CommercialPlan[] {
  return sortPlansByCommercialOrder(
    allPlans.filter(
      (p) =>
        p.status === "active" &&
        typeof p.womValue === "number" &&
        p.womValue > 0 &&
        p.motorEnabled !== false,
    ),
  );
}

function getActiveEquipment(catalog: EquipmentCatalogItem[]): EquipmentCatalogItem[] {
  return catalog.filter((e) => e.status === "active" && e.installmentValue > 0);
}

function planLineRules(
  plan: CommercialPlan,
  lines: number,
): { ok: boolean; reason?: string } {
  if (lines > plan.maxLines) {
    return { ok: false, reason: `Supera el máximo de ${plan.maxLines} línea(s) del plan.` };
  }
  const additionalCount = lines - 1;
  const maxAdditional = plan.offer.maxAdditionalLines ?? 0;
  const additionalUnit = getAdditionalLineUnitPrice(plan);
  if (additionalCount > 0 && (additionalUnit <= 0 || maxAdditional <= 0)) {
    return { ok: false, reason: "Este plan no admite líneas adicionales." };
  }
  if (additionalCount > maxAdditional) {
    return {
      ok: false,
      reason: `Admite como máximo ${maxAdditional} línea(s) adicional(es).`,
    };
  }
  return { ok: true };
}

/** Cargo fijo real mensual (sin precio promocional). */
export function calculatePlanFixedCharge(
  plan: CommercialPlan,
  lines: number,
): {
  mainLineFixedCharge: number;
  additionalLinesCount: number;
  additionalLineUnitPrice: number;
  additionalLinesTotal: number;
  planMonthlyTotal: number;
} {
  const mainLineFixedCharge = plan.womValue;
  const additionalLinesCount = Math.max(0, lines - 1);
  const additionalLineUnitPrice = getAdditionalLineUnitPrice(plan);
  const additionalLinesTotal = additionalLinesCount * additionalLineUnitPrice;
  return {
    mainLineFixedCharge,
    additionalLinesCount,
    additionalLineUnitPrice,
    additionalLinesTotal,
    planMonthlyTotal: mainLineFixedCharge + additionalLinesTotal,
  };
}

function toEquipmentRef(item: EquipmentCatalogItem): OfferEquipmentRef {
  return {
    id: item.id,
    commercialName: item.commercialName,
    brand: item.brand,
    model: item.model,
    installmentValue: item.installmentValue,
    isPieCero: item.isPieCero,
  };
}

function buildEligibleEquipment(
  planMonthlyTotal: number,
  input: OfferSimulationRequest,
  activeEquipment: EquipmentCatalogItem[],
): { maxInstallment: number; eligible: OfferEquipmentRef[]; onlyWithout: boolean; note?: string } {
  const wantsEquipment = input.wantsEquipment ?? false;
  const equipmentCredit = input.equipmentCredit ?? 0;

  if (!wantsEquipment) {
    return { maxInstallment: 0, eligible: [], onlyWithout: false };
  }

  if (equipmentCredit <= 0) {
    return {
      maxInstallment: 0,
      eligible: [],
      onlyWithout: true,
      note: "No es posible ofrecer equipo porque el cupo para equipo es $0.",
    };
  }

  const roomOnLine = input.lineCredit - planMonthlyTotal;
  const maxInstallment = Math.max(0, Math.min(equipmentCredit, roomOnLine));

  if (maxInstallment <= 0) {
    return {
      maxInstallment: 0,
      eligible: [],
      onlyWithout: true,
      note: "Esta oferta solo es viable sin equipo.",
    };
  }

  const eligible = activeEquipment
    .filter(
      (e) =>
        e.installmentValue <= equipmentCredit &&
        e.installmentValue <= maxInstallment &&
        planMonthlyTotal + e.installmentValue <= input.lineCredit,
    )
    .sort((a, b) => a.installmentValue - b.installmentValue)
    .map(toEquipmentRef);

  return {
    maxInstallment,
    eligible,
    onlyWithout: eligible.length === 0,
    note:
      eligible.length === 0
        ? "Esta oferta solo es viable sin equipo."
        : undefined,
  };
}

function emptyEquipmentBlock(): Pick<
  PlanCommercialOffer,
  | "equipmentCredit"
  | "wantsEquipment"
  | "maxEquipmentInstallment"
  | "eligibleEquipment"
  | "equipmentOnlyWithoutDevice"
  | "note"
> {
  return {
    equipmentCredit: 0,
    wantsEquipment: false,
    maxEquipmentInstallment: 0,
    eligibleEquipment: [],
    equipmentOnlyWithoutDevice: false,
    note: undefined,
  };
}

type EvaluateResult = {
  offers: PlanCommercialOffer[];
  discardedPlans: DiscardedPlan[];
  discardedEquipment: DiscardedEquipment[];
};

function evaluatePlansOnlyAtLines(
  lines: number,
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
): EvaluateResult {
  const offers: PlanCommercialOffer[] = [];
  const discardedPlans: DiscardedPlan[] = [];

  for (const plan of plans) {
    const rules = planLineRules(plan, lines);
    const pricing = calculatePlanFixedCharge(plan, lines);

    if (!rules.ok) {
      discardedPlans.push({
        planId: plan.id,
        planName: plan.name,
        reason: rules.reason ?? "No cumple reglas comerciales.",
      });
      continue;
    }

    if (pricing.planMonthlyTotal > input.lineCredit) {
      discardedPlans.push({
        planId: plan.id,
        planName: plan.name,
        reason: "Supera el Cupo Línea.",
      });
      continue;
    }

    offers.push({
      rank: 0,
      planId: plan.id,
      planName: plan.name,
      promotionalPrice: plan.promotionalPrice ?? null,
      lines,
      ...pricing,
      lineCredit: input.lineCredit,
      lineConsumed: pricing.planMonthlyTotal,
      lineRemaining: input.lineCredit - pricing.planMonthlyTotal,
      ...emptyEquipmentBlock(),
    });
  }

  offers.sort((a, b) => b.lineRemaining - a.lineRemaining || a.planName.localeCompare(b.planName, "es"));
  offers.forEach((o, i) => {
    o.rank = i + 1;
  });

  return { offers, discardedPlans, discardedEquipment: [] };
}

function evaluateWithEquipmentAtLines(
  lines: number,
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): EvaluateResult {
  const offers: PlanCommercialOffer[] = [];
  const discardedPlans: DiscardedPlan[] = [];
  const discardedEquipment: DiscardedEquipment[] = [];
  const wantsEquipment = input.wantsEquipment ?? false;
  const equipmentCredit = input.equipmentCredit ?? 0;
  const activeEquipment = getActiveEquipment(equipmentCatalog);

  if (wantsEquipment && equipmentCredit > 0) {
    for (const eq of activeEquipment) {
      if (eq.installmentValue > equipmentCredit) {
        discardedEquipment.push({
          id: eq.id,
          label: eq.commercialName || `${eq.brand} ${eq.model}`.trim(),
          installmentValue: eq.installmentValue,
          reason: "La cuota supera el Cupo Equipo.",
        });
      }
    }
  }

  for (const plan of plans) {
    const rules = planLineRules(plan, lines);
    const pricing = calculatePlanFixedCharge(plan, lines);

    if (!rules.ok) {
      discardedPlans.push({
        planId: plan.id,
        planName: plan.name,
        reason: rules.reason ?? "No cumple reglas comerciales.",
      });
      continue;
    }

    if (pricing.planMonthlyTotal > input.lineCredit) {
      discardedPlans.push({
        planId: plan.id,
        planName: plan.name,
        reason: "Supera el Cupo Línea.",
      });
      continue;
    }

    const equipmentBlock = buildEligibleEquipment(
      pricing.planMonthlyTotal,
      input,
      activeEquipment,
    );

    offers.push({
      rank: 0,
      planId: plan.id,
      planName: plan.name,
      promotionalPrice: plan.promotionalPrice ?? null,
      lines,
      ...pricing,
      lineCredit: input.lineCredit,
      lineConsumed: pricing.planMonthlyTotal,
      lineRemaining: input.lineCredit - pricing.planMonthlyTotal,
      equipmentCredit,
      wantsEquipment,
      maxEquipmentInstallment: equipmentBlock.maxInstallment,
      eligibleEquipment: equipmentBlock.eligible,
      equipmentOnlyWithoutDevice: equipmentBlock.onlyWithout,
      note: equipmentBlock.note,
    });
  }

  offers.sort((a, b) => b.lineRemaining - a.lineRemaining || a.planName.localeCompare(b.planName, "es"));
  offers.forEach((o, i) => {
    o.rank = i + 1;
  });

  return { offers, discardedPlans, discardedEquipment };
}

function optimizationMessage(
  requestedLines: number,
  evaluatedLines: number,
): string | undefined {
  if (evaluatedLines < requestedLines) {
    return `La mejor oferta posible es portar ${evaluatedLines} línea${evaluatedLines === 1 ? "" : "s"}.`;
  }
  return undefined;
}

function runLineOptimization(
  input: OfferSimulationRequest,
  evaluate: (lines: number) => EvaluateResult,
  extras: Partial<OfferGenerationResult> = {},
): OfferGenerationResult {
  const equipmentCredit = input.equipmentCredit ?? 0;
  const wantsEquipment = input.wantsEquipment ?? false;

  for (let lines = input.requestedLines; lines >= 1; lines--) {
    const evaluated = evaluate(lines);
    if (evaluated.offers.length > 0) {
      return {
        saleType: input.saleType,
        requestedLines: input.requestedLines,
        evaluatedLines: lines,
        lineCredit: input.lineCredit,
        equipmentCredit,
        wantsEquipment,
        optimized: lines < input.requestedLines,
        optimizationMessage: optimizationMessage(input.requestedLines, lines),
        offers: evaluated.offers,
        discardedPlans: evaluated.discardedPlans,
        discardedEquipment: evaluated.discardedEquipment,
        viableCount: evaluated.offers.length,
        ...extras,
      };
    }
  }

  const fallback = evaluate(input.requestedLines);

  return {
    saleType: input.saleType,
    requestedLines: input.requestedLines,
    evaluatedLines: input.requestedLines,
    lineCredit: input.lineCredit,
    equipmentCredit,
    wantsEquipment,
    optimized: false,
    offers: [],
    discardedPlans: fallback.discardedPlans,
    discardedEquipment: fallback.discardedEquipment,
    viableCount: 0,
    optimizationMessage:
      "No fue posible encontrar una combinación comercial viable con los cupos ingresados.",
    ...extras,
  };
}

/** Motor Portabilidad Postpago — evalúa planes y equipos. */
function generatePortabilityPostpaidOffers(
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): OfferGenerationResult {
  let equipmentCreditZeroMessage: string | undefined;

  const wantsEquipment = input.wantsEquipment ?? false;
  const equipmentCredit = input.equipmentCredit ?? 0;

  if (wantsEquipment && equipmentCredit <= 0) {
    equipmentCreditZeroMessage =
      "No es posible ofrecer equipo porque el cupo para equipo es $0.";
  }

  return runLineOptimization(
    input,
    (lines) => evaluateWithEquipmentAtLines(lines, input, plans, equipmentCatalog),
    { equipmentCreditZeroMessage },
  );
}

/** Motor Prepago → Postpago — solo planes móviles, sin equipos. */
function generatePortabilityPrepaidOffers(
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
): OfferGenerationResult {
  const sanitized: OfferSimulationRequest = {
    ...input,
    wantsEquipment: false,
    equipmentCredit: 0,
  };

  return runLineOptimization(
    sanitized,
    (lines) => evaluatePlansOnlyAtLines(lines, sanitized, plans),
    {
      prepaidInfoMessage: PREPAID_PORTABILITY_INFO_MESSAGE,
      equipmentCredit: 0,
      wantsEquipment: false,
      discardedEquipment: [],
    },
  );
}

/** Motor Línea Nueva — evalúa planes y equipos (reglas propias, separado del postpago). */
function generateNewLineOffers(
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): OfferGenerationResult {
  let equipmentCreditZeroMessage: string | undefined;

  const wantsEquipment = input.wantsEquipment ?? false;
  const equipmentCredit = input.equipmentCredit ?? 0;

  if (wantsEquipment && equipmentCredit <= 0) {
    equipmentCreditZeroMessage =
      "No es posible ofrecer equipo porque el cupo para equipo es $0.";
  }

  return runLineOptimization(
    input,
    (lines) => evaluateWithEquipmentAtLines(lines, input, plans, equipmentCatalog),
    { equipmentCreditZeroMessage },
  );
}

function withEquipmentDefaults(input: OfferSimulationRequest): Required<
  Pick<OfferSimulationRequest, "equipmentCredit" | "wantsEquipment">
> &
  OfferSimulationRequest {
  return {
    ...input,
    equipmentCredit: input.equipmentCredit ?? 0,
    wantsEquipment: input.wantsEquipment ?? false,
  };
}

/** Motor comercial WOM — delega en estrategia según tipo de venta. */
export function generateCommercialOffers(
  input: OfferSimulationRequest,
  allPlans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): OfferGenerationResult {
  const plans = getEvaluablePlans(allPlans);
  const normalized = withEquipmentDefaults(input);

  switch (normalized.saleType) {
    case "portability_prepaid":
      return generatePortabilityPrepaidOffers(normalized, plans);
    case "portability_postpaid":
      return generatePortabilityPostpaidOffers(normalized, plans, equipmentCatalog);
    case "new_line":
      return generateNewLineOffers(normalized, plans, equipmentCatalog);
    default: {
      const _exhaustive: never = normalized.saleType;
      return _exhaustive;
    }
  }
}
