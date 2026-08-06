import type { CommercialPlan, UpsertCommercialPlanInput } from "@/types/commercial-config";

/** Plan almacenado con campos legacy (operatorPayment). */
type StoredCommercialPlan = CommercialPlan & {
  operatorPayment?: number;
  additionalLineValue?: number;
  maxLines?: number;
  benefits?: string[];
  promotions?: string[];
  commercialText?: string;
  specialConditions?: string;
};

/** Normaliza planes guardados antes de la migración Valor Wom / Valor DuMo. */
export function normalizeCommercialPlan(raw: StoredCommercialPlan): CommercialPlan {
  const legacy = raw.operatorPayment;
  const womValue = raw.womValue ?? legacy ?? 0;
  const dumoValue = raw.dumoValue ?? legacy ?? 0;
  return {
    id: raw.id,
    name: raw.name,
    operator: raw.operator,
    saleType: raw.saleType,
    womValue,
    additionalLineValue: raw.additionalLineValue ?? womValue,
    maxLines: raw.maxLines ?? 5,
    dumoValue,
    advisorCommission: raw.advisorCommission,
    benefits: raw.benefits ?? [],
    promotions: raw.promotions ?? [],
    commercialText: raw.commercialText ?? "",
    specialConditions: raw.specialConditions ?? "",
    status: raw.status,
  };
}

export function normalizeCommercialPlans(plans: StoredCommercialPlan[]): CommercialPlan[] {
  return plans.map(normalizeCommercialPlan);
}

export function toPlanInput(plan: Omit<CommercialPlan, "id">): UpsertCommercialPlanInput {
  return {
    name: plan.name,
    operator: plan.operator,
    saleType: plan.saleType,
    womValue: plan.womValue,
    additionalLineValue: plan.additionalLineValue,
    maxLines: plan.maxLines,
    dumoValue: plan.dumoValue,
    advisorCommission: plan.advisorCommission,
    benefits: plan.benefits,
    promotions: plan.promotions,
    commercialText: plan.commercialText,
    specialConditions: plan.specialConditions,
    status: plan.status,
  };
}

function matchPlan(planName: string, plans: CommercialPlan[]): CommercialPlan | undefined {
  const q = planName.trim().toLowerCase();
  if (!q) return undefined;
  const exact = plans.find((p) => p.name.toLowerCase() === q && p.status === "active");
  if (exact) return exact;
  return plans.find(
    (p) =>
      p.status === "active" &&
      (q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q)),
  );
}

export function resolveWomValueForPlan(planName: string, plans: CommercialPlan[]): number {
  return matchPlan(planName, plans)?.womValue ?? 0;
}

export function resolveDumoValueForPlan(planName: string, plans: CommercialPlan[]): number {
  return matchPlan(planName, plans)?.dumoValue ?? 0;
}

export function buildPlanValueIndex(plans: CommercialPlan[]): Map<string, { wom: number; dumo: number }> {
  const index = new Map<string, { wom: number; dumo: number }>();
  for (const p of plans) {
    if (p.status !== "active") continue;
    index.set(p.name.toLowerCase(), { wom: p.womValue, dumo: p.dumoValue });
  }
  return index;
}
