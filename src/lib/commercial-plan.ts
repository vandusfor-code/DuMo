import type { CommercialPlan, UpsertCommercialPlanInput } from "@/types/commercial-config";
import {
  deriveAdditionalLineValue,
  deriveMaxLines,
  resolvePlanOffer,
} from "@/lib/commercial-plan-offer";

/** Plan almacenado con campos legacy previos a la oferta estructurada. */
type StoredCommercialPlan = Omit<Partial<CommercialPlan>, "offer"> & {
  id: string;
  name: string;
  operator: string;
  saleType: CommercialPlan["saleType"];
  womValue?: number;
  operatorPayment?: number;
  additionalLineValue?: number;
  maxLines?: number;
  dumoValue?: number;
  advisorCommission?: number;
  offer?: CommercialPlan["offer"];
  specialConditions?: string;
  status: CommercialPlan["status"];
  /** @deprecated Migrado a offer */
  benefits?: string[];
  /** @deprecated Migrado a offer.freeBills */
  promotions?: string[];
  /** @deprecated Eliminado — usar offer */
  commercialText?: string;
  /** @deprecated Migrado a offer */
  specs?: {
    gb?: string;
    minutes?: string;
    sms?: string;
    appsLibres?: string;
    roaming?: string;
    clubWom?: string;
    pedidosYa?: string;
    cuponEquipos?: string;
    cuotasGratis?: string;
    maxAdditionalLines?: number;
  };
};

/** Normaliza operator a 'wom'|'claro' — datos previos a multi-operador traían texto libre (ej. "WOM"). */
function normalizeCarrierOperator(operator: string | undefined): string {
  const value = (operator ?? "").trim().toLowerCase();
  return value === "claro" ? "claro" : "wom";
}

export function normalizeCommercialPlan(raw: StoredCommercialPlan): CommercialPlan {
  const legacy = raw.operatorPayment;
  const womValue = raw.womValue ?? legacy ?? 0;
  const dumoValue = raw.dumoValue ?? legacy ?? 0;
  const offer = resolvePlanOffer(raw);
  const additionalLineValue = deriveAdditionalLineValue(offer) || raw.additionalLineValue || 0;
  const maxLines = deriveMaxLines(offer) || raw.maxLines || 1;

  return {
    id: raw.id,
    name: raw.name,
    operator: normalizeCarrierOperator(raw.operator),
    saleType: raw.saleType,
    womValue,
    promotionalPrice: raw.promotionalPrice ?? null,
    commercialOrder: raw.commercialOrder ?? null,
    motorEnabled: raw.motorEnabled !== false,
    additionalLineValue,
    maxLines,
    dumoValue,
    advisorCommission: raw.advisorCommission ?? 0,
    offer,
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
    promotionalPrice: plan.promotionalPrice ?? null,
    commercialOrder: plan.commercialOrder ?? null,
    motorEnabled: plan.motorEnabled !== false,
    additionalLineValue: plan.additionalLineValue,
    maxLines: plan.maxLines,
    dumoValue: plan.dumoValue,
    advisorCommission: plan.advisorCommission,
    offer: plan.offer,
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
    const entry = { wom: p.womValue, dumo: p.dumoValue };
    index.set(p.name.toLowerCase(), entry);
    index.set(p.id.toLowerCase(), entry);
  }
  return index;
}

export function findCommercialPlanById(
  planId: string,
  plans: CommercialPlan[],
): CommercialPlan | undefined {
  const id = planId.trim();
  if (!id) return undefined;
  return plans.find((p) => p.id === id && p.status === "active");
}
