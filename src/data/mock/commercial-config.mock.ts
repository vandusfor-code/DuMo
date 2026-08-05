import type { CommercialGlobalSettings, CommercialPlan } from "@/types/commercial-config";

export const COMMERCIAL_SETTINGS_MOCK: CommercialGlobalSettings = {
  monthlyGoal: 850000000,
  profitGoal: 120000000,
  baseCommission: 45000,
  specialBonus: 15000,
  campaignCommission: 8000,
};

export const COMMERCIAL_PLANS_MOCK: CommercialPlan[] = [
  { id: "plan-001", name: "Portabilidad XS", operator: "Movistar", saleType: "portabilidad", operatorPayment: 55000, advisorCommission: 12000, status: "active" },
  { id: "plan-002", name: "Portabilidad M", operator: "Movistar", saleType: "portabilidad", operatorPayment: 72000, advisorCommission: 18000, status: "active" },
  { id: "plan-003", name: "Portabilidad XL", operator: "Claro", saleType: "portabilidad", operatorPayment: 95000, advisorCommission: 25000, status: "active" },
  { id: "plan-004", name: "Migración", operator: "Tigo", saleType: "migracion", operatorPayment: 140000, advisorCommission: 35000, status: "active" },
  { id: "plan-005", name: "Renovación", operator: "Movistar", saleType: "renovacion", operatorPayment: 55000, advisorCommission: 14000, status: "active" },
  { id: "plan-006", name: "Línea nueva", operator: "Claro", saleType: "linea_nueva", operatorPayment: 68000, advisorCommission: 17000, status: "active" },
  { id: "plan-007", name: "Fibra 300MB", operator: "ETB", saleType: "fibra", operatorPayment: 140000, advisorCommission: 32000, status: "active" },
  { id: "plan-008", name: "Prepago", operator: "WOM", saleType: "prepago", operatorPayment: 25000, advisorCommission: 8000, status: "active" },
  { id: "plan-009", name: "Postpago Control", operator: "Movistar", saleType: "postpago", operatorPayment: 58000, advisorCommission: 15000, status: "active" },
  { id: "plan-010", name: "Fibra 500MB", operator: "ETB", saleType: "fibra", operatorPayment: 180000, advisorCommission: 42000, status: "inactive" },
];

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
