/** Debug temporal — npx tsx scripts/debug-script-flow-con-equipo.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import { getScriptUnavailableReason, isScriptEligible } from "../src/lib/sales-script/eligibility";
import { buildSalesScript } from "../src/lib/sales-script/builder";
import { resolveScriptFlow } from "../src/lib/sales-script/flows/registry";
import { buildScriptContext } from "../src/lib/sales-script/context";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));
const EQ = EQUIPMENT_CATALOG_MOCK[0];

const gestion: SaveLeadInput = {
  conversationId: "conv-debug",
  phone: "56912345678",
  customerName: "Debug Test",
  rut: "12.345.678-9",
  type: "venta",
  notes: "",
  lines: [{
    phone: "56912345670", saleType: "portability", planId: "plan-o",
    equipment: EQ.commercialName, equipmentMode: "with",
    currentOperator: "movistar", deliveryType: "home",
    email: "d@test.cl", deliveryAddress: "Av Test 123",
    region: "metropolitana", comuna: "Providencia",
    equipmentCatalogId: EQ.id,
    equipmentModel: `${EQ.brand} ${EQ.model}`,
    equipmentValue: String(EQ.totalValue),
    equipmentDownPayment: String(EQ.downPayment),
    equipmentInstallments: String(EQ.installmentsCount),
    equipmentInstallmentValue: String(EQ.installmentValue),
    equipmentCommercialText: EQ.commercialText,
    accountType: "postpaid",
  }],
};

const main = gestion.lines[0];

console.log("\n=== DEBUG FLUJO PORTABILIDAD CON EQUIPO ===\n");
console.log("1. saleType:", main.saleType);
console.log("2. equipmentMode:", main.equipmentMode);
console.log("3. equipmentCatalogId:", main.equipmentCatalogId);
console.log("4. getScriptUnavailableReason():", getScriptUnavailableReason(gestion));
console.log("5. isScriptEligible():", isScriptEligible(gestion));

const ctx = buildScriptContext({
  gestion,
  commercialPlans: PLANS,
  equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  advisor: { name: "María", email: "maria@wom.cl" },
});

if (ctx) {
  const flow = resolveScriptFlow(ctx);
  console.log("6. resolveScriptFlow():", { key: flow.key, title: flow.title });
} else {
  console.log("6. resolveScriptFlow(): (contexto null — no se llega al flujo)");
}

const script = buildSalesScript({
  gestionId: "G-debug",
  gestion,
  commercialPlans: PLANS,
  equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  advisor: { name: "María", email: "maria@wom.cl" },
});

console.log(
  "7. buildSalesScript():",
  script ? `SÍ → ${script.flowKey} (${script.steps.length} bloques)` : "NO (null)",
);
console.log("\n=== FIN DEBUG ===\n");
