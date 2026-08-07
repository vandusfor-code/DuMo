import type { CommercialPlan } from "@/types/commercial-config";
import type { EquipmentCatalogItem } from "@/types/equipment";
import type {
  OfferEligibleEquipment,
  OfferGenerationResult,
  OfferPlanAlternative,
  OfferSimulationRequest,
} from "@/types/offer-engine";
import { getAdditionalLineUnitPrice } from "@/lib/sales-script/teleprompter/contract-pricing";

const PRIORITY_PLAN_IDS = ["plan-w", "plan-o", "plan-m"];

function sortPlans(plans: CommercialPlan[]): CommercialPlan[] {
  return [...plans].sort((a, b) => {
    const ai = PRIORITY_PLAN_IDS.indexOf(a.id);
    const bi = PRIORITY_PLAN_IDS.indexOf(b.id);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
    return a.name.localeCompare(b.name, "es");
  });
}

/** Planes activos con cargo fijo configurado. */
export function getEvaluablePlans(allPlans: CommercialPlan[]): CommercialPlan[] {
  return sortPlans(
    allPlans.filter(
      (p) => p.status === "active" && typeof p.womValue === "number" && p.womValue > 0,
    ),
  );
}

function planLineRules(
  plan: CommercialPlan,
  requestedLines: number,
): { ok: boolean; reason?: string } {
  if (requestedLines > plan.maxLines) {
    return { ok: false, reason: `Este plan admite máximo ${plan.maxLines} línea(s).` };
  }
  if (requestedLines > 1 && plan.id === "plan-w") {
    return { ok: false, reason: "Plan W no admite líneas adicionales." };
  }
  const additionalCount = requestedLines - 1;
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

/** Cargo fijo mensual: principal + adicionales × precio vigente (sin promos). */
export function calculatePlanFixedCharge(
  plan: CommercialPlan,
  requestedLines: number,
): {
  mainLineFixedCharge: number;
  additionalLinesCount: number;
  additionalLineUnitPrice: number;
  additionalLinesTotal: number;
  totalMonthlyFixed: number;
} {
  const mainLineFixedCharge = plan.womValue ?? 0;
  const additionalLinesCount = Math.max(0, requestedLines - 1);
  const additionalLineUnitPrice = getAdditionalLineUnitPrice(plan);
  const additionalLinesTotal = additionalLinesCount * additionalLineUnitPrice;
  return {
    mainLineFixedCharge,
    additionalLinesCount,
    additionalLineUnitPrice,
    additionalLinesTotal,
    totalMonthlyFixed: mainLineFixedCharge + additionalLinesTotal,
  };
}

function mapEligibleEquipment(
  catalog: EquipmentCatalogItem[],
  maxInstallment: number,
): OfferEligibleEquipment[] {
  return catalog
    .filter(
      (e) =>
        e.status === "active" &&
        e.installmentValue > 0 &&
        e.installmentValue <= maxInstallment,
    )
    .sort((a, b) => a.installmentValue - b.installmentValue)
    .map((e) => ({
      id: e.id,
      commercialName: e.commercialName,
      brand: e.brand,
      model: e.model,
      installmentValue: e.installmentValue,
    }));
}

function evaluatePlanAlternative(
  plan: CommercialPlan,
  input: OfferSimulationRequest,
  equipmentCatalog: EquipmentCatalogItem[],
): OfferPlanAlternative {
  const pricing = calculatePlanFixedCharge(plan, input.requestedLines);
  const rules = planLineRules(plan, input.requestedLines);
  const fitsLineCredit = pricing.totalMonthlyFixed <= input.lineCredit;
  const viable = rules.ok && fitsLineCredit;

  let notViableReason: string | undefined;
  if (!rules.ok) notViableReason = rules.reason;
  else if (!fitsLineCredit) {
    notViableReason = `El cargo fijo (${pricing.totalMonthlyFixed.toLocaleString("es-CL")}) supera el cupo línea.`;
  }

  const roomOnLine = input.lineCredit - pricing.totalMonthlyFixed;
  const maxEquipmentInstallment = input.wantsEquipment
    ? Math.max(0, Math.min(input.equipmentCredit, roomOnLine))
    : 0;

  const eligibleEquipment =
    input.wantsEquipment && viable
      ? mapEligibleEquipment(equipmentCatalog, maxEquipmentInstallment)
      : [];

  const equipmentOnlyWithoutDevice =
    input.wantsEquipment && viable && maxEquipmentInstallment <= 0;

  const equipmentViable =
    input.wantsEquipment && viable && !equipmentOnlyWithoutDevice && eligibleEquipment.length > 0;

  return {
    planId: plan.id,
    planName: plan.name,
    ...pricing,
    lineCredit: input.lineCredit,
    consumedCredit: viable ? pricing.totalMonthlyFixed : 0,
    remainingCredit: viable ? input.lineCredit - pricing.totalMonthlyFixed : 0,
    viable,
    statusLabel: viable ? "Aprobada" : "No viable",
    notViableReason,
    wantsEquipment: input.wantsEquipment,
    maxEquipmentInstallment,
    equipmentViable,
    equipmentOnlyWithoutDevice,
    eligibleEquipment,
  };
}

/** Evalúa automáticamente todos los planes del catálogo y devuelve alternativas. */
export function generateOfferAlternatives(
  input: OfferSimulationRequest,
  allPlans: CommercialPlan[],
  equipmentCatalog: EquipmentCatalogItem[],
): OfferGenerationResult {
  const plans = getEvaluablePlans(allPlans);
  const alternatives = plans.map((plan) =>
    evaluatePlanAlternative(plan, input, equipmentCatalog),
  );
  const viableCount = alternatives.filter((a) => a.viable).length;

  return {
    saleType: input.saleType,
    requestedLines: input.requestedLines,
    lineCredit: input.lineCredit,
    equipmentCredit: input.equipmentCredit,
    wantsEquipment: input.wantsEquipment,
    alternatives,
    viableCount,
  };
}
