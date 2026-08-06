/** Verifica Bloque 10 transversal — npx tsx scripts/preview-block10-transversal.ts */
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
    conversationId: "conv-b10-sin",
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
    conversationId: "conv-b10-con",
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

const sinB10 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-10");
const conB10 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-10");
if (!sinB10 || !conB10) throw new Error("bloque-10 no encontrado");

const sin809 = sinB10.branch?.prefijo809;
const con809 = conB10.branch?.prefijo809;

const checks: [string, boolean][] = [
  ["content idéntico", sinB10.content === conB10.content],
  ["sectionLabel idéntico", sinB10.sectionLabel === conB10.sectionLabel],
  ["rama prefijo809 presente", Boolean(sin809) && Boolean(con809)],
  ["yesSpeech idéntico", sin809?.yesSpeech === con809?.yesSpeech],
  ["noSpeech idéntico", sin809?.noSpeech === con809?.noSpeech],
  ["followUpNoSpeech idéntico", sin809?.followUpNoSpeech === con809?.followUpNoSpeech],
  ["consultaSpeech idéntico", sin809?.consultaSpeech === con809?.consultaSpeech],
  ["advisorNoteOnBlockStart idéntico", sin809?.advisorNoteOnBlockStart === con809?.advisorNoteOnBlockStart],
  ["advisorNoteOnYes idéntico", sin809?.advisorNoteOnYes === con809?.advisorNoteOnYes],
  ["pregunta Spam", sinB10.content.includes("llamadas Spam o no deseadas")],
];

console.log("\n--- BLOQUE 10 · TRANSVERSAL ---\n");
console.log("Sin Equipo:\n", sinB10.content);
console.log("\nCon Equipo:\n", conB10.content);
console.log("");

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
