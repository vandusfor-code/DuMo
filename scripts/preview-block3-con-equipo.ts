/**
 * Vista previa del Bloque 3 — Portabilidad con Equipo (solo local, no commit).
 * npx tsx scripts/preview-block3-con-equipo.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildBlock3ContratacionConEquipoSpeech } from "../src/lib/sales-script/teleprompter/block3-contratacion-con-equipo-speech";
import { buildBlock3EquipmentFinancingSpeech } from "../src/lib/sales-script/teleprompter/block3-equipment-financing-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-o", "plan-m"].includes(p.id));
const EQ = EQUIPMENT_CATALOG_MOCK[0];
const EQ_ZERO_PIE = { ...EQ, id: "eq-zero-pie", downPayment: 0 };
const CATALOG = [...EQUIPMENT_CATALOG_MOCK, EQ_ZERO_PIE];

function equipmentLine(
  index: number,
  planId: string,
  opts?: { isUpselling?: boolean; downPayment?: number; equipmentId?: string },
): SaveLeadInput["lines"][number] {
  const item = opts?.equipmentId === EQ_ZERO_PIE.id ? EQ_ZERO_PIE : EQ;
  const downPayment = opts?.downPayment ?? item.downPayment;
  return {
    phone: `5691234567${index}`,
    saleType: "portability",
    planId,
    equipment: item.commercialName,
    equipmentMode: "with",
    currentOperator: "movistar",
    deliveryType: "home",
    email: "cliente@test.cl",
    deliveryAddress: "Av. Providencia 123",
    region: "metropolitana",
    comuna: "Providencia",
    equipmentCatalogId: opts?.equipmentId ?? item.id,
    equipmentModel: `${item.brand} ${item.model}`.trim(),
    equipmentValue: String(item.totalValue),
    equipmentDownPayment: String(downPayment),
    equipmentInstallments: String(item.installmentsCount),
    equipmentInstallmentValue: String(item.installmentValue),
    equipmentCommercialText: item.commercialText,
    accountType: "postpaid",
    isUpselling: opts?.isUpselling,
  };
}

function baseGestion(lines: SaveLeadInput["lines"]): SaveLeadInput {
  return {
    conversationId: "conv-preview-b3",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines,
  };
}

function printScenario(title: string, gestion: SaveLeadInput) {
  const ctx = buildScriptContext({
    gestion,
    commercialPlans: PLANS,
    equipmentCatalog: CATALOG,
    advisor: { name: "Camila Rojas", email: "camila.rojas@ventas.wom.cl" },
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx) throw new Error(`Contexto nulo: ${title}`);

  const block3 = buildBlock3ContratacionConEquipoSpeech(ctx);

  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log("\n--- FASE A: Validación de datos ---\n");
  console.log(block3.content);
  console.log("\n--- FASE B: Resumen + equipo (post Sí) ---\n");
  console.log(block3.branch.dataValidation?.postValidationSpeech ?? "");
}

printScenario("1 línea — Plan O + Samsung Galaxy A36 5G", baseGestion([equipmentLine(0, "plan-o")]));

printScenario("Multilínea homogénea — 2 líneas Plan O + equipo", baseGestion([
  equipmentLine(0, "plan-o"),
  equipmentLine(1, "plan-o"),
]));

printScenario("Upselling — Plan M + equipo", baseGestion([
  equipmentLine(0, "plan-m", { isUpselling: true }),
]));

printScenario("Escenario A — Pie $0 (sin link de pago)", baseGestion([
  equipmentLine(0, "plan-o", { downPayment: 0, equipmentId: EQ_ZERO_PIE.id }),
]));

printScenario("Escenario B — Pie inicial > $0 (con link de pago 24h)", baseGestion([
  equipmentLine(0, "plan-o", { downPayment: EQ.downPayment }),
]));

const ctxEquipOnly = buildScriptContext({
  gestion: baseGestion([equipmentLine(0, "plan-o")]),
  commercialPlans: PLANS,
  equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});
if (ctxEquipOnly?.mainEquipment) {
  console.log("\n" + "=".repeat(72));
  console.log("Párrafo EQUIPO aislado (ctx.mainEquipment)");
  console.log("=".repeat(72));
  console.log("\n" + buildBlock3EquipmentFinancingSpeech(ctxEquipOnly.mainEquipment));
  console.log("\nDatos de contexto:");
  console.log(JSON.stringify(ctxEquipOnly.mainEquipment, null, 2));
}
