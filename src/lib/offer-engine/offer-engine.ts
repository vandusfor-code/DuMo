import type { CommercialPlan } from "@/types/commercial-config";
import type { EquipmentCatalogItem } from "@/types/equipment";
import type {
  OfferEquipmentSnapshot,
  OfferOptimizationType,
  OfferPlanSnapshot,
  OfferRecommendation,
  OfferSimulationRequest,
  OfferSimulationStatus,
} from "@/types/offer-engine";

export type OfferEngineContext = {
  plans: Map<string, CommercialPlan>;
  equipment: EquipmentCatalogItem | null;
};

function planSnapshot(plan: CommercialPlan): OfferPlanSnapshot {
  return {
    planId: plan.id,
    planName: plan.name,
    fixedCharge: plan.womValue ?? 0,
  };
}

function equipmentSnapshot(item: EquipmentCatalogItem): OfferEquipmentSnapshot {
  return {
    equipmentId: item.id,
    commercialName: item.commercialName,
    brand: item.brand,
    model: item.model,
    color: item.color,
    totalValue: item.totalValue,
    downPayment: item.downPayment,
    installmentsCount: item.installmentsCount,
    installmentValue: item.installmentValue,
  };
}

/** Suma cargo fijo principal + adicionales + cuota mensual equipo. */
export function calculateMonthlyCost(
  mainPlanId: string,
  additionalPlanIds: string[],
  equipmentInstallment: number,
  plans: Map<string, CommercialPlan>,
): number {
  const main = plans.get(mainPlanId);
  let total = main?.womValue ?? 0;
  for (const id of additionalPlanIds) {
    total += plans.get(id)?.womValue ?? 0;
  }
  return total + equipmentInstallment;
}

/** Valida cupo equipo: cuota mensual <= cupo equipo. */
export function validateEquipment(
  equipment: EquipmentCatalogItem | null,
  equipmentCredit: number,
): { allowed: boolean; installment: number } {
  if (!equipment) return { allowed: false, installment: 0 };
  if (equipment.status !== "active") return { allowed: false, installment: 0 };
  const installment = equipment.installmentValue;
  if (installment > equipmentCredit) return { allowed: false, installment: 0 };
  return { allowed: true, installment };
}

function buildPlanBlock(
  mainPlanId: string,
  additionalPlanIds: string[],
  plans: Map<string, CommercialPlan>,
): OfferPlanSnapshot & { additionalPlans: OfferPlanSnapshot[] } {
  const main = plans.get(mainPlanId);
  return {
    planId: mainPlanId,
    planName: main?.name ?? mainPlanId,
    fixedCharge: main?.womValue ?? 0,
    additionalPlans: additionalPlanIds.map((id) => {
      const p = plans.get(id);
      return {
        planId: id,
        planName: p?.name ?? id,
        fixedCharge: p?.womValue ?? 0,
      };
    }),
  };
}

function resolveOptimizationType(
  removedEquipment: boolean,
  removedLines: number,
): OfferOptimizationType {
  if (removedEquipment && removedLines > 0) return "REMOVE_EQUIPMENT_AND_REDUCE_LINES";
  if (removedEquipment) return "REMOVE_EQUIPMENT";
  if (removedLines > 0) return "REDUCE_LINES";
  return "NONE";
}

function buildRecommendationText(
  status: OfferSimulationStatus,
  removedEquipment: boolean,
  removedLines: number,
  approvedLines: number,
  requestedLines: number,
): string {
  if (status === "APPROVED") return "Oferta aprobada exactamente como fue solicitada.";
  if (status === "REJECTED") return "No existe una combinación comercial viable.";
  if (removedEquipment && removedLines > 0) {
    return `Se recomienda retirar el equipo y ofrecer únicamente ${approvedLines} línea${approvedLines === 1 ? "" : "s"}.`;
  }
  if (removedEquipment) return "Se recomienda retirar el equipo para cumplir el cupo disponible.";
  if (removedLines > 0) {
    if (approvedLines < requestedLines) {
      return `No es posible ofrecer ${requestedLines} líneas. La mejor oferta encontrada es ${approvedLines} línea${approvedLines === 1 ? "" : "s"}.`;
    }
    return `Se recomienda ofrecer únicamente ${approvedLines} línea${approvedLines === 1 ? "" : "s"}.`;
  }
  return "Oferta optimizada automáticamente.";
}

function buildResult(
  input: OfferSimulationRequest,
  ctx: OfferEngineContext,
  opts: {
    approvedLines: number;
    approvedAdditionalIds: string[];
    approvedEquipment: boolean;
    equipmentInstallment: number;
    removedEquipment: boolean;
    removedLines: number;
    equipmentRemovedByCupo: boolean;
  },
): OfferRecommendation {
  const { plans, equipment } = ctx;
  const requestedAdditional = input.additionalPlans.map((p) => p.planId);
  const requestedEquipment = Boolean(input.equipmentId);
  const requestedMonthly = calculateMonthlyCost(
    input.mainPlanId,
    requestedAdditional,
    requestedEquipment && equipment ? equipment.installmentValue : 0,
    plans,
  );
  const approvedMonthly = calculateMonthlyCost(
    input.mainPlanId,
    opts.approvedAdditionalIds,
    opts.approvedEquipment ? opts.equipmentInstallment : 0,
    plans,
  );

  const fits = approvedMonthly <= input.lineCredit;
  const changed =
    opts.removedEquipment ||
    opts.removedLines > 0 ||
    opts.equipmentRemovedByCupo ||
    opts.approvedLines !== input.requestedLines ||
    opts.approvedEquipment !== requestedEquipment;

  let status: OfferSimulationStatus;
  if (!fits) {
    status = "REJECTED";
  } else if (!changed) {
    status = "APPROVED";
  } else {
    status = "OPTIMIZED";
  }

  const optimizationType = resolveOptimizationType(
    opts.removedEquipment || opts.equipmentRemovedByCupo,
    opts.removedLines,
  );

  const rejectionReasons: string[] = [];
  if (status === "REJECTED") {
    if (input.lineCredit <= 0) rejectionReasons.push("El cupo línea es insuficiente.");
    const oneLineCost = calculateMonthlyCost(input.mainPlanId, [], 0, plans);
    if (oneLineCost > input.lineCredit) {
      rejectionReasons.push("Ni una sola línea cumple las reglas comerciales.");
    } else {
      rejectionReasons.push("El cupo línea es insuficiente para la combinación solicitada.");
    }
    if (requestedEquipment && equipment && equipment.installmentValue > input.equipmentCredit) {
      rejectionReasons.push("El cupo equipo no alcanza.");
    }
  }

  return {
    approved: fits,
    reason: status === "REJECTED" ? "Sin capacidad comercial" : "Viable",
    requestedLines: input.requestedLines,
    approvedLines: opts.approvedLines,
    requestedEquipment,
    approvedEquipment: opts.approvedEquipment,
    requestedMonthlyValue: requestedMonthly,
    approvedMonthlyValue: approvedMonthly,
    lineCredit: input.lineCredit,
    equipmentCredit: input.equipmentCredit,
    remainingCredit: fits ? input.lineCredit - approvedMonthly : 0,
    removedEquipment: opts.removedEquipment || opts.equipmentRemovedByCupo,
    removedLines: opts.removedLines,
    status,
    optimizationType,
    recommendation: buildRecommendationText(
      status,
      opts.removedEquipment || opts.equipmentRemovedByCupo,
      opts.removedLines,
      opts.approvedLines,
      input.requestedLines,
    ),
    requestedPlan: buildPlanBlock(input.mainPlanId, requestedAdditional, plans),
    approvedPlan: buildPlanBlock(input.mainPlanId, opts.approvedAdditionalIds, plans),
    requestedEquipmentDetail:
      requestedEquipment && equipment ? equipmentSnapshot(equipment) : null,
    approvedEquipmentDetail:
      opts.approvedEquipment && equipment ? equipmentSnapshot(equipment) : null,
    rejectionReasons,
  };
}

/** Motor principal: valida, calcula y optimiza la oferta comercial. */
export function calculateOffer(
  input: OfferSimulationRequest,
  ctx: OfferEngineContext,
): OfferRecommendation {
  const { plans, equipment } = ctx;
  const requestedAdditional = input.additionalPlans.map((p) => p.planId);
  const requestedEquipment = Boolean(input.equipmentId);

  let equipmentRemovedByCupo = false;
  let equipmentAllowed = false;
  let equipmentInstallment = 0;

  if (requestedEquipment && equipment) {
    const validation = validateEquipment(equipment, input.equipmentCredit);
    equipmentAllowed = validation.allowed;
    equipmentInstallment = validation.installment;
    if (!validation.allowed) equipmentRemovedByCupo = true;
  }

  let approvedAdditional = [...requestedAdditional];
  let approvedEquipment = equipmentAllowed;
  let removedEquipment = equipmentRemovedByCupo;
  let removedLines = 0;

  let total = calculateMonthlyCost(
    input.mainPlanId,
    approvedAdditional,
    approvedEquipment ? equipmentInstallment : 0,
    plans,
  );

  if (total <= input.lineCredit) {
    return buildResult(input, ctx, {
      approvedLines: 1 + approvedAdditional.length,
      approvedAdditionalIds: approvedAdditional,
      approvedEquipment,
      equipmentInstallment,
      removedEquipment,
      removedLines,
      equipmentRemovedByCupo,
    });
  }

  // Paso 1: quitar equipo si aún está incluido
  if (approvedEquipment) {
    approvedEquipment = false;
    removedEquipment = true;
    total = calculateMonthlyCost(input.mainPlanId, approvedAdditional, 0, plans);
    if (total <= input.lineCredit) {
      return buildResult(input, ctx, {
        approvedLines: 1 + approvedAdditional.length,
        approvedAdditionalIds: approvedAdditional,
        approvedEquipment: false,
        equipmentInstallment: 0,
        removedEquipment: true,
        removedLines: 0,
        equipmentRemovedByCupo,
      });
    }
  }

  // Paso 2: reducir líneas adicionales
  while (approvedAdditional.length > 0) {
    approvedAdditional = approvedAdditional.slice(0, -1);
    removedLines++;
    total = calculateMonthlyCost(input.mainPlanId, approvedAdditional, 0, plans);
    if (total <= input.lineCredit) {
      return buildResult(input, ctx, {
        approvedLines: 1 + approvedAdditional.length,
        approvedAdditionalIds: approvedAdditional,
        approvedEquipment: false,
        equipmentInstallment: 0,
        removedEquipment: removedEquipment || equipmentRemovedByCupo,
        removedLines,
        equipmentRemovedByCupo,
      });
    }
  }

  // Paso 3: una sola línea sin equipo — ya evaluado arriba si additional vacío
  return buildResult(input, ctx, {
    approvedLines: 1,
    approvedAdditionalIds: [],
    approvedEquipment: false,
    equipmentInstallment: 0,
    removedEquipment: removedEquipment || equipmentRemovedByCupo,
    removedLines: Math.max(removedLines, requestedAdditional.length),
    equipmentRemovedByCupo,
  });
}

/** Valida que los planes existan y estén activos. */
export function assertPlansExist(
  planIds: string[],
  plans: Map<string, CommercialPlan>,
): string | null {
  for (const id of planIds) {
    const plan = plans.get(id);
    if (!plan) return `Plan "${id}" no existe en el catálogo.`;
    if (plan.status !== "active") return `Plan "${plan.name}" no está activo.`;
    if (!plan.womValue || plan.womValue <= 0) {
      return `Plan "${plan.name}" no tiene cargo fijo configurado.`;
    }
  }
  return null;
}
