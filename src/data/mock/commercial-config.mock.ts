import type { CommercialGlobalSettings, CommercialPlan } from "@/types/commercial-config";
import { normalizeCommercialPlan } from "@/lib/commercial-plan";

export const COMMERCIAL_SETTINGS_MOCK: CommercialGlobalSettings = {
  monthlyGoal: 120,
  economicGoal: 8_000_000,
  baseCommission: 18_000,
  monthlyBudget: 3_000_000,
};

const PLAN_W_COMMERCIAL = `Tu plan incluye:

• 150 GB para navegar en red 5G.
• Minutos libres.
• SMS libres.
• Apps Libres.
• Acceso al Club WOM con beneficios exclusivos.

Todo por un valor mensual transparente de $10.990.`;

const PLAN_O_COMMERCIAL = `Tu plan incluye:

• 300 GB para navegar en red 5G.
• Minutos libres.
• SMS libres.
• Apps Libres.
• WhatsApp Libre en Roaming Internacional.
• Club WOM.
• Cupón de 10% de descuento en equipos y accesorios con tope de $100.000 cada 24 meses.
• Última cuota gratis al financiar un equipo.

Todo por un valor mensual de $13.990.`;

const PLAN_M_COMMERCIAL = `Tu plan incluye:

• Gigas Libres para navegar en red 5G.
• Minutos libres.
• SMS libres.
• Apps Libres.
• WhatsApp Libre más 3 GB para Roaming Internacional.
• Suscripción incluida a PedidosYa Plus.
• Club WOM.
• Cupón de 10% en equipos y accesorios con tope de $100.000 cada 12 meses.
• Las cuotas 17 y 18 gratis al financiar un equipo.

Todo por un valor mensual de $18.990.`;

const RAW_PLANS: CommercialPlan[] = [
  {
    id: "plan-w",
    name: "Plan W",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 10_990,
    additionalLineValue: 7_990,
    maxLines: 5,
    dumoValue: 8_000,
    advisorCommission: 10_000,
    benefits: ["150 GB", "Minutos libres", "SMS libres", "Apps Libres", "Club WOM"],
    promotions: ["3° boleta $0", "6° boleta $0"],
    commercialText: PLAN_W_COMMERCIAL,
    specialConditions: "",
    specs: {
      gb: "150 GB",
      sms: "SMS Libres",
      minutes: "Minutos Libres",
      appsLibres: "Sí",
      roaming: "No aplica",
      clubWom: "Incluido",
      pedidosYa: "No",
      cuponEquipos: "No",
      cuotasGratis: "No",
      maxAdditionalLines: 4,
    },
    status: "active",
  },
  {
    id: "plan-o",
    name: "Plan O",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 13_990,
    additionalLineValue: 7_990,
    maxLines: 5,
    dumoValue: 9_500,
    advisorCommission: 12_000,
    benefits: ["300 GB", "Minutos libres", "SMS libres", "Apps Libres", "Club WOM", "WhatsApp Roaming", "Cupón 10%"],
    promotions: ["3° boleta $0", "6° boleta $0"],
    commercialText: PLAN_O_COMMERCIAL,
    specialConditions: "",
    specs: {
      gb: "300 GB",
      sms: "Libres",
      minutes: "Libres",
      appsLibres: "Libres",
      roaming: "WhatsApp Libre",
      clubWom: "Sí",
      pedidosYa: "No",
      cuponEquipos: "10% tope $100.000 cada 24 meses",
      cuotasGratis: "1 cuota (18)",
      maxAdditionalLines: 4,
    },
    status: "active",
  },
  {
    id: "plan-m",
    name: "Plan M",
    operator: "WOM",
    saleType: "portabilidad",
    womValue: 18_990,
    additionalLineValue: 7_990,
    maxLines: 5,
    dumoValue: 13_000,
    advisorCommission: 15_000,
    benefits: ["GB Libres", "Minutos libres", "SMS libres", "Apps Libres", "PedidosYa Plus", "Club WOM"],
    promotions: ["3° boleta $0", "6° boleta $0"],
    commercialText: PLAN_M_COMMERCIAL,
    specialConditions: "",
    specs: {
      gb: "GB Libres",
      sms: "Libres",
      minutes: "Libres",
      appsLibres: "Libres",
      roaming: "WhatsApp Libre + 3 GB",
      clubWom: "Sí",
      pedidosYa: "Incluido",
      cuponEquipos: "10% tope $100.000 cada 12 meses",
      cuotasGratis: "Cuotas 17 y 18",
      maxAdditionalLines: 4,
    },
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
