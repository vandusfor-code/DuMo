/** Verifica Bloque 11 transversal — npx tsx scripts/preview-block11-transversal.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const EQ = EQUIPMENT_CATALOG_MOCK[0];

function sinEquipoGestion(): SaveLeadInput {
  return {
    conversationId: "conv-b11-sin",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [{
      phone: "56912345670", saleType: "portability", planId: "plan-o", equipment: "none", equipmentMode: "without",
      currentOperator: "movistar", deliveryType: "home", email: "c@test.cl", deliveryAddress: "Av. Providencia 123",
      region: "metropolitana", comuna: "Providencia", accountType: "postpaid",
    }],
  };
}

function conEquipoGestion(): SaveLeadInput {
  return {
    conversationId: "conv-b11-con",
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

const sinCtx = buildScriptContext({ gestion: sinEquipoGestion(), commercialPlans: PLANS, deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG });
const conCtx = buildScriptContext({ gestion: conEquipoGestion(), commercialPlans: PLANS, equipmentCatalog: EQUIPMENT_CATALOG_MOCK, deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG });
if (!sinCtx || !conCtx) throw new Error("contexto nulo");

const sinB11 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-11");
const conB11 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-11");
if (!sinB11 || !conB11) throw new Error("bloque-11 no encontrado");

const checks: [string, boolean][] = [
  ["content idéntico", sinB11.content === conB11.content],
  ["sectionLabel idéntico", sinB11.sectionLabel === conB11.sectionLabel],
  ["rama referral presente", Boolean(sinB11.branch?.referral) && Boolean(conB11.branch?.referral)],
  ["advisorNote idéntico", sinB11.branch?.referral?.advisorNote === conB11.branch?.referral?.advisorNote],
  ["discurso oficial", sinB11.content.includes("me gustaría saber si conoces a alguien")],
  ["sin pregunta extra inventada", !sinB11.content.includes("¿Me podrías compartir")],
];

console.log("\n--- BLOQUE 11 · TRANSVERSAL ---\n");
console.log("Sin Equipo:\n", sinB11.content);
console.log("\nCon Equipo:\n", conB11.content);
console.log("\nNota asesora:", conB11.branch?.referral?.advisorNote);
console.log("");

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
