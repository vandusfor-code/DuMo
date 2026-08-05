import type { CommercialGlobalSettings, CommercialPlan } from "@/types/commercial-config";
import { normalizeCommercialPlan } from "@/lib/commercial-plan";

export const COMMERCIAL_SETTINGS_MOCK: CommercialGlobalSettings = {
  monthlyGoal: 300,
  profitGoal: 120000000,
  baseCommission: 45000,
  specialBonus: 15000,
  campaignCommission: 8000,
};

const RAW_PLANS: CommercialPlan[] = [
  { id: "plan-001", name: "Portabilidad XS", operator: "WOM", saleType: "portabilidad", womValue: 55000, dumoValue: 38000, advisorCommission: 12000, status: "active" },
  { id: "plan-002", name: "Portabilidad M", operator: "WOM", saleType: "portabilidad", womValue: 72000, dumoValue: 50000, advisorCommission: 18000, status: "active" },
  { id: "plan-003", name: "Portabilidad XL", operator: "WOM", saleType: "portabilidad", womValue: 95000, dumoValue: 66000, advisorCommission: 25000, status: "active" },
  { id: "plan-004", name: "Migración", operator: "WOM", saleType: "migracion", womValue: 140000, dumoValue: 98000, advisorCommission: 35000, status: "active" },
  { id: "plan-005", name: "Renovación", operator: "WOM", saleType: "renovacion", womValue: 55000, dumoValue: 38000, advisorCommission: 14000, status: "active" },
  { id: "plan-006", name: "Línea nueva", operator: "WOM", saleType: "linea_nueva", womValue: 68000, dumoValue: 47000, advisorCommission: 17000, status: "active" },
  { id: "plan-007", name: "Fibra 300MB", operator: "WOM", saleType: "fibra", womValue: 140000, dumoValue: 98000, advisorCommission: 32000, status: "active" },
  { id: "plan-008", name: "Prepago", operator: "WOM", saleType: "prepago", womValue: 25000, dumoValue: 17000, advisorCommission: 8000, status: "active" },
  { id: "plan-009", name: "Postpago Control", operator: "WOM", saleType: "postpago", womValue: 58000, dumoValue: 40000, advisorCommission: 15000, status: "active" },
  { id: "plan-010", name: "Fibra 500MB", operator: "WOM", saleType: "fibra", womValue: 180000, dumoValue: 126000, advisorCommission: 42000, status: "inactive" },
];

export const COMMERCIAL_PLANS_MOCK: CommercialPlan[] = RAW_PLANS.map(normalizeCommercialPlan);

/** Busca comisión por nombre de plan (case-insensitive, parcial). */
export function findPlanCommission(planName: string, plans = COMMERCIAL_PLANS_MOCK): number {
  const q = planName.toLowerCase();
  const exact = plans.find((p) => p.name.toLowerCase() === q && p.status === "active");
  if (exact) return exact.advisorCommission;
  const partial = plans.find(
    (p) => p.status === "active" && (q.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(q)),
  );
  if (partial) return partial.advisorCommission;
  return COMMERCIAL_SETTINGS_MOCK.baseCommission;
}
