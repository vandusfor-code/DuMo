/** Verifica Bloque 6 transversal — npx tsx scripts/preview-block6-transversal.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const EQ = EQUIPMENT_CATALOG_MOCK[0];

function sinEquipoGestion(accountType: "postpaid" | "prepaid"): SaveLeadInput {
  return {
    conversationId: "conv-b6-sin",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [{
      phone: "56912345670", saleType: "portability", planId: "plan-o", equipment: "none", equipmentMode: "without",
      currentOperator: "movistar", deliveryType: "home", email: "c@test.cl", deliveryAddress: "Av. Providencia 123",
      region: "metropolitana", comuna: "Providencia", accountType,
    }],
  };
}

function conEquipoGestion(accountType: "postpaid" | "prepaid"): SaveLeadInput {
  return {
    conversationId: "conv-b6-con",
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
      accountType,
    }],
  };
}

function compare(label: string, accountType: "postpaid" | "prepaid") {
  const sinCtx = buildScriptContext({ gestion: sinEquipoGestion(accountType), commercialPlans: PLANS, deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG });
  const conCtx = buildScriptContext({ gestion: conEquipoGestion(accountType), commercialPlans: PLANS, equipmentCatalog: EQUIPMENT_CATALOG_MOCK, deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG });
  if (!sinCtx || !conCtx) throw new Error("contexto nulo");

  const sinB6 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-6");
  const conB6 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-6");
  if (!sinB6 || !conB6) throw new Error("bloque-6 no encontrado");

  const sameContent = sinB6.content === conB6.content;
  const sameCap = Boolean(sinB6.branch?.cap) === Boolean(conB6.branch?.cap);
  const sameProcess = Boolean(sinB6.branch?.portabilityProcess) === Boolean(conB6.branch?.portabilityProcess);

  console.log(`\n${label}`);
  console.log(`  content idéntico: ${sameContent ? "SÍ" : "NO"}`);
  console.log(`  rama cap: ${sameCap ? "SÍ" : "NO"} (${conB6.branch?.cap ? "presente" : "ausente"})`);
  console.log(`  rama portabilityProcess: ${sameProcess ? "SÍ" : "NO"}`);
  if (!sameContent) {
    console.log("  ERROR: contenido difiere");
    process.exitCode = 1;
  }
}

compare("Postpago (sin CAP)", "postpaid");
compare("Prepago → postpago (con CAP)", "prepaid");
