/** Verifica Bloque 7 transversal — npx tsx scripts/preview-block7-transversal.ts */
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
    conversationId: "conv-b7-sin",
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
    conversationId: "conv-b7-con",
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

const sinB7 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-7");
const conB7 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-7");
if (!sinB7 || !conB7) throw new Error("bloque-7 no encontrado");

const sameContent = sinB7.content === conB7.content;
const sameLabel = sinB7.sectionLabel === conB7.sectionLabel;
const noBranch = !sinB7.branch && !conB7.branch;

console.log("\n--- BLOQUE 7 · TRANSVERSAL ---\n");
console.log("Sin Equipo:\n", sinB7.content);
console.log("\nCon Equipo:\n", conB7.content);
console.log(`\ncontent idéntico: ${sameContent ? "SÍ" : "NO"}`);
console.log(`sectionLabel idéntico: ${sameLabel ? "SÍ" : "NO"}`);
console.log(`sin ramas en ningún flujo: ${noBranch ? "SÍ" : "NO"}`);

if (!sameContent || !sameLabel || !noBranch) process.exitCode = 1;
