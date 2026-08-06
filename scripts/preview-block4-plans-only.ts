/** Preview Plan W/O/M only — npx tsx scripts/preview-block4-plans-only.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildBlock4PlanBenefitsConEquipoSpeech } from "../src/lib/sales-script/teleprompter/block4-plan-benefits-con-equipo-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));
const EQ = EQUIPMENT_CATALOG_MOCK[0];

function gestion(planId: string): SaveLeadInput {
  return {
    conversationId: "conv-preview-b4-plans",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56912345670",
        saleType: "portability",
        planId,
        equipment: EQ.commercialName,
        equipmentMode: "with",
        currentOperator: "movistar",
        deliveryType: "home",
        email: "cliente@test.cl",
        deliveryAddress: "Av. Providencia 123",
        region: "metropolitana",
        comuna: "Providencia",
        equipmentCatalogId: EQ.id,
        equipmentModel: `${EQ.brand} ${EQ.model}`.trim(),
        equipmentValue: String(EQ.totalValue),
        equipmentDownPayment: String(EQ.downPayment),
        equipmentInstallments: String(EQ.installmentsCount),
        equipmentInstallmentValue: String(EQ.installmentValue),
        equipmentCommercialText: EQ.commercialText,
        accountType: "postpaid",
      },
    ],
  };
}

for (const [title, planId] of [
  ["Plan W", "plan-w"],
  ["Plan O", "plan-o"],
  ["Plan M", "plan-m"],
] as const) {
  const ctx = buildScriptContext({
    gestion: gestion(planId),
    commercialPlans: PLANS,
    equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx) throw new Error(`Sin contexto: ${title}`);

  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log(buildBlock4PlanBenefitsConEquipoSpeech(ctx));
}
