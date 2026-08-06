/** Verifica Bloque 8 transversal — npx tsx scripts/preview-block8-transversal.ts */
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
    conversationId: "conv-b8-sin",
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
    conversationId: "conv-b8-con",
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

const sinB8 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-8");
const conB8 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-8");
if (!sinB8 || !conB8) throw new Error("bloque-8 no encontrado");

const sameContent = sinB8.content === conB8.content;
const sameLabel = sinB8.sectionLabel === conB8.sectionLabel;
const samePostSpeech = sinB8.branch?.npsSurvey?.postQuestionSpeech === conB8.branch?.npsSurvey?.postQuestionSpeech;
const sameAdvisorNote = sinB8.branch?.npsSurvey?.advisorNoteBeforeContinue === conB8.branch?.npsSurvey?.advisorNoteBeforeContinue;
const hasNpsBranch = Boolean(sinB8.branch?.npsSurvey) && Boolean(conB8.branch?.npsSurvey);

console.log("\n--- BLOQUE 8 · TRANSVERSAL ---\n");
console.log("Fase 1 (Sin Equipo):\n", sinB8.content);
console.log("\nFase 1 (Con Equipo):\n", conB8.content);
console.log(`\ncontent idéntico: ${sameContent ? "SÍ" : "NO"}`);
console.log(`sectionLabel idéntico: ${sameLabel ? "SÍ" : "NO"}`);
console.log(`rama npsSurvey presente en ambos: ${hasNpsBranch ? "SÍ" : "NO"}`);
console.log(`postQuestionSpeech idéntico: ${samePostSpeech ? "SÍ" : "NO"}`);
console.log(`advisorNoteBeforeContinue idéntico: ${sameAdvisorNote ? "SÍ" : "NO"}`);

if (!sameContent || !sameLabel || !samePostSpeech || !sameAdvisorNote || !hasNpsBranch) process.exitCode = 1;
