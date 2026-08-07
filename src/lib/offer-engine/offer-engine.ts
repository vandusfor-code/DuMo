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
import { getAdditionalLineUnitPrice } from "@/lib/sales-script/teleprompter/contract-pricing";

function sortPlansByCommercialOrder(plans: CommercialPlan[]): CommercialPlan[] {
  return [...plans].sort((a, b) => {
    const ao = a.commercialOrder ?? 999;
    const bo = b.commercialOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name, "es");
  });
}

/** Planes activos con cargo fijo real — todo desde catálogo, sin IDs quemados. */
export function getEvaluablePlans(allPlans: CommercialPlan[]): CommercialPlan[] {
  return sortPlansByCommercialOrder(
    allPlans.filter(
      (p) => p.status === "active" && typeof p.womValue === "number" && p.womValue > 0,
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
  if (!input.wantsEquipment) {
    return { maxInstallment: 0, eligible: [], onlyWithout: false };
  }

  if (input.equipmentCredit <= 0) {
    return {
      maxInstallment: 0,
      eligible: [],
      onlyWithout: true,
      note: "No es posible ofrecer equipo porque el cupo para equipo es $0.",
    };
  }

  const roomOnLine = input.lineCredit - planMonthlyTotal;
  const maxInstallment = Math.max(0, Math.min(input.equipmentCredit, roomOnLine));

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
        e.installmentValue <= input.equipmentCredit &&
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

function evaluateAtLines(
  lines: number,
  input: OfferSimulationRequest,
  plans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): {
  offers: PlanCommercialOffer[];
  discardedPlans: DiscardedPlan[];
  discardedEquipment: DiscardedEquipment[];
} {
  const offers: PlanCommercialOffer[] = [];
  const discardedPlans: DiscardedPlan[] = [];
  const discardedEquipment: DiscardedEquipment[] = [];
  const activeEquipment = getActiveEquipment(equipmentCatalog);

  if (input.wantsEquipment && input.equipmentCredit > 0) {
    for (const eq of activeEquipment) {
      if (eq.installmentValue > input.equipmentCredit) {
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
      equipmentCredit: input.equipmentCredit,
      wantsEquipment: input.wantsEquipment,
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

/** Motor comercial WOM: evalúa todos los planes activos y equipos del catálogo. */
export function generateCommercialOffers(
  input: OfferSimulationRequest,
  allPlans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): OfferGenerationResult {
  const plans = getEvaluablePlans(allPlans);
  let equipmentCreditZeroMessage: string | undefined;

  if (input.wantsEquipment && input.equipmentCredit <= 0) {
    equipmentCreditZeroMessage =
      "No es posible ofrecer equipo porque el cupo para equipo es $0.";
  }

  for (let lines = input.requestedLines; lines >= 1; lines--) {
    const evaluated = evaluateAtLines(lines, input, plans, equipmentCatalog);
    if (evaluated.offers.length > 0) {
      return {
        saleType: input.saleType,
        requestedLines: input.requestedLines,
        evaluatedLines: lines,
        lineCredit: input.lineCredit,
        equipmentCredit: input.equipmentCredit,
        wantsEquipment: input.wantsEquipment,
        optimized: lines < input.requestedLines,
        optimizationMessage: optimizationMessage(input.requestedLines, lines),
        equipmentCreditZeroMessage,
        offers: evaluated.offers,
        discardedPlans: evaluated.discardedPlans,
        discardedEquipment: evaluated.discardedEquipment,
        viableCount: evaluated.offers.length,
      };
    }
  }

  const fallback = evaluateAtLines(
    input.requestedLines,
    input,
    plans,
    equipmentCatalog,
  );

  return {
    saleType: input.saleType,
    requestedLines: input.requestedLines,
    evaluatedLines: input.requestedLines,
    lineCredit: input.lineCredit,
    equipmentCredit: input.equipmentCredit,
    wantsEquipment: input.wantsEquipment,
    optimized: false,
    equipmentCreditZeroMessage,
    offers: [],
    discardedPlans: fallback.discardedPlans,
    discardedEquipment: fallback.discardedEquipment,
    viableCount: 0,
    optimizationMessage:
      "No fue posible encontrar una combinación comercial viable con los cupos ingresados.",
  };
}
