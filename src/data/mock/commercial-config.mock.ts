import type { CommercialGlobalSettings, CommercialPlan } from "@/types/commercial-config";
import { normalizeCommercialPlan } from "@/lib/commercial-plan";

export const COMMERCIAL_SETTINGS_MOCK: CommercialGlobalSettings = {
  monthlyGoal: 120,
  economicGoal: 8_000_000,
  baseCommission: 18_000,
  monthlyBudget: 3_000_000,
};

const RAW_PLANS: CommercialPlan[] = [
  {
    id: "plan-w",
    name: "Plan W",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 18_990,
    additionalLineValue: 7_990,
    maxLines: 5,
    dumoValue: 13_000,
    advisorCommission: 12_000,
    benefits: ["300 GB", "Minutos libres", "Apps libres", "Club WOM", "WhatsApp libre", "Cupón 10%", "Última cuota gratis"],
    promotions: ["3° boleta $0", "6° boleta $0"],
    commercialText: "Plan W con 300 GB, minutos libres, apps libres, Club WOM, WhatsApp libre, cupón 10% y última cuota gratis.",
    specialConditions: "",
    status: "active",
  },
  {
    id: "plan-o",
    name: "Plan O",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 13_990,
    additionalLineValue: 5_990,
    maxLines: 5,
    dumoValue: 9_500,
    advisorCommission: 10_000,
    benefits: ["150 GB", "Minutos libres", "Apps libres", "Club WOM", "WhatsApp libre"],
    promotions: ["3° boleta $0"],
    commercialText: "Plan O con 150 GB, minutos libres, apps libres, Club WOM y WhatsApp libre.",
    specialConditions: "",
    status: "active",
  },
  {
    id: "plan-m",
    name: "Plan M",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 9_990,
    additionalLineValue: 3_990,
    maxLines: 5,
    dumoValue: 7_000,
    advisorCommission: 8_000,
    benefits: ["80 GB", "Minutos libres", "WhatsApp libre"],
    promotions: [],
    commercialText: "Plan M con 80 GB, minutos libres y WhatsApp libre.",
    specialConditions: "",
    status: "active",
  },
  { id: "plan-001", name: "Portabilidad XS", operator: "WOM", saleType: "portabilidad", womValue: 55000, additionalLineValue: 45000, maxLines: 5, dumoValue: 38000, advisorCommission: 12000, benefits: ["50 GB", "Minutos libres"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-002", name: "Portabilidad M", operator: "WOM", saleType: "portabilidad", womValue: 72000, additionalLineValue: 55000, maxLines: 5, dumoValue: 50000, advisorCommission: 18000, benefits: ["200 GB", "Minutos libres", "Apps libres"], promotions: ["3° boleta $0"], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-003", name: "Portabilidad XL", operator: "WOM", saleType: "portabilidad", womValue: 95000, additionalLineValue: 70000, maxLines: 5, dumoValue: 66000, advisorCommission: 25000, benefits: ["GB libres", "Minutos libres", "Roaming"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-004", name: "Migración", operator: "WOM", saleType: "migracion", womValue: 140000, additionalLineValue: 90000, maxLines: 3, dumoValue: 98000, advisorCommission: 35000, benefits: ["Fibra + móvil"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-005", name: "Renovación", operator: "WOM", saleType: "renovacion", womValue: 55000, additionalLineValue: 45000, maxLines: 5, dumoValue: 38000, advisorCommission: 14000, benefits: ["Renovación de equipo"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-006", name: "Línea nueva", operator: "WOM", saleType: "linea_nueva", womValue: 68000, additionalLineValue: 50000, maxLines: 5, dumoValue: 47000, advisorCommission: 17000, benefits: ["Línea nueva"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-007", name: "Fibra 300MB", operator: "WOM", saleType: "fibra", womValue: 140000, additionalLineValue: 0, maxLines: 1, dumoValue: 98000, advisorCommission: 32000, benefits: ["300 MB fibra"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-008", name: "Prepago", operator: "WOM", saleType: "prepago", womValue: 25000, additionalLineValue: 0, maxLines: 1, dumoValue: 17000, advisorCommission: 8000, benefits: ["Prepago"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-009", name: "Postpago Control", operator: "WOM", saleType: "postpago", womValue: 58000, additionalLineValue: 45000, maxLines: 5, dumoValue: 40000, advisorCommission: 15000, benefits: ["Control de gasto"], promotions: [], commercialText: "", specialConditions: "", status: "active" },
  { id: "plan-010", name: "Fibra 500MB", operator: "WOM", saleType: "fibra", womValue: 180000, additionalLineValue: 0, maxLines: 1, dumoValue: 126000, advisorCommission: 42000, benefits: ["500 MB fibra"], promotions: [], commercialText: "", specialConditions: "", status: "inactive" },
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
