/**
 * Vista previa del Bloque 4 — Portabilidad con Equipo (solo local, no commit).
 * npx tsx scripts/preview-block4-con-equipo.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildBlock4PlanBenefitsConEquipoSpeech } from "../src/lib/sales-script/teleprompter/block4-plan-benefits-con-equipo-speech";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));
const EQ = EQUIPMENT_CATALOG_MOCK[0];

function equipmentLine(index: number, planId: string): SaveLeadInput["lines"][number] {
  return {
    phone: `5691234567${index}`,
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
  };
}

function gestion(lines: SaveLeadInput["lines"]): SaveLeadInput {
  return {
    conversationId: "conv-preview-b4",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines,
  };
}

function printScenario(title: string, input: SaveLeadInput) {
  const ctx = buildScriptContext({
    gestion: input,
    commercialPlans: PLANS,
    equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx) throw new Error(`Contexto nulo: ${title}`);

  const block4 = buildBlock4PlanBenefitsConEquipoSpeech(ctx);
  const blocks = buildTeleprompterBlocksConEquipo(ctx);
  const registered = blocks.find((b) => b.id === "bloque-4");

  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log(block4);
  console.log("\n--- Verificación orquestador bloque-4 ---");
  console.log(registered?.content === block4 ? "OK: contenido coincide" : "ERROR: contenido distinto");
}

printScenario("Plan W — 1 línea", gestion([equipmentLine(0, "plan-w")]));
printScenario("Plan O — 1 línea", gestion([equipmentLine(0, "plan-o")]));
printScenario("Plan M — 1 línea", gestion([equipmentLine(0, "plan-m")]));
printScenario("Multilínea homogénea — 2 líneas Plan O", gestion([
  equipmentLine(0, "plan-o"),
  equipmentLine(1, "plan-o"),
]));
printScenario("Multilínea heterogénea — Plan O + Plan M", gestion([
  equipmentLine(0, "plan-o"),
  equipmentLine(1, "plan-m"),
]));
