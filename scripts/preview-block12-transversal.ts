/** Verifica Bloque 12 transversal — npx tsx scripts/preview-block12-transversal.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const EQ = EQUIPMENT_CATALOG_MOCK[0];

function conEquipoGestion(): SaveLeadInput {
  return {
    conversationId: "conv-b12-con",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [{
      phone: "56912345670", saleType: "portability", planId: "plan-o", equipment: EQ.commercialName, equipmentMode: "with",
      currentOperator: "movistar", deliveryType: "home", email: "c@test.cl", deliveryAddress: "Av. Providencia 123",
      region: "metropolitana", comuna: "Providencia", equipmentCatalogId: EQ.id,
      equipmentModel: `${EQ.brand} ${EQ.model}`, equipmentValue: String(EQ.totalValue),
      equipmentDownPayment: String(EQ.downPayment), equipmentInstallments: String(EQ.installmentsCount),
      equipmentInstallmentValue: String(EQ.installmentValue), equipmentCommercialText: EQ.commercialText,
      accountType: "postpaid",
    }],
  };
}

const sinCtx = buildScriptContext({
  gestion: {
    ...conEquipoGestion(),
    lines: [{ ...conEquipoGestion().lines[0], equipment: "none", equipmentMode: "without", equipmentCatalogId: "" }],
  },
  commercialPlans: PLANS,
  advisor: { name: "María Asesora", email: "maria@wom.cl" },
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});
const conCtx = buildScriptContext({
  gestion: conEquipoGestion(),
  commercialPlans: PLANS,
  equipmentCatalog: EQUIPMENT_CATALOG_MOCK,
  advisor: { name: "María Asesora", email: "maria@wom.cl" },
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});
if (!sinCtx || !conCtx) throw new Error("contexto nulo");

const sinB12 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-12");
const conB12 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-12");
if (!sinB12 || !conB12) throw new Error("bloque-12 no encontrado");

const checks: [string, boolean][] = [
  ["content idéntico", sinB12.content === conB12.content],
  ["sectionLabel idéntico", sinB12.sectionLabel === conB12.sectionLabel],
  ["correo ejecutivo resuelto", conB12.content.includes("maria@wom.cl")],
  ["nombre ejecutivo resuelto", conB12.content.includes("María Asesora")],
  ["despedida oficial", conB12.content.includes("Bienvenido a WOM, que tengas un excelente día!")],
  ["sin ramas", !conB12.branch && !sinB12.branch],
];

console.log("\n--- BLOQUE 12 · TRANSVERSAL ---\n");
console.log(conB12.content);
console.log("");
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) process.exitCode = 1;
}
