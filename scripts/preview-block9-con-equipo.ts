/** Verifica Bloque 9 Con Equipo — npx tsx scripts/preview-block9-con-equipo.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const EQ = EQUIPMENT_CATALOG_MOCK[0];

const VDI_CON_EQUIPO =
  "Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad aceptas las condiciones de estos contratos, es decir, tanto del contrato de servicios móvil como el de compraventa del equipo financiado. ¿Lo aceptas?";

function sinEquipoGestion(): SaveLeadInput {
  return {
    conversationId: "conv-b9-sin",
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
    conversationId: "conv-b9-con",
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

const sinB9 = buildTeleprompterBlocks(sinCtx).find((b) => b.id === "bloque-9");
const conB9 = buildTeleprompterBlocksConEquipo(conCtx).find((b) => b.id === "bloque-9");
if (!sinB9 || !conB9) throw new Error("bloque-9 no encontrado");

const sinVdi = sinB9.branch?.acceptance?.postCondicionesSpeech ?? "";
const conVdi = conB9.branch?.acceptance?.postCondicionesSpeech ?? "";

const checks: [string, boolean][] = [
  ["Fase 1 idéntica Sin/Con", sinB9.content === conB9.content],
  ["Sin Equipo: este contrato", sinVdi.includes("este contrato")],
  ["Sin Equipo: sin dos contratos", !sinVdi.includes("estos contratos")],
  ["Con Equipo: VDI oficial exacto", conVdi === VDI_CON_EQUIPO],
  ["Con Equipo: servicios móvil", conVdi.includes("contrato de servicios móvil")],
  ["Con Equipo: compraventa equipo", conVdi.includes("compraventa del equipo financiado")],
  ["Con Equipo: sin este contrato", !conVdi.includes("este contrato")],
  ["Rama condicionesDudas presente", Boolean(conB9.branch?.condicionesDudas?.advisorNoteOnYes)],
  ["Rama acceptance presente", Boolean(conB9.branch?.acceptance?.postCondicionesSpeech)],
  ["Nota VDI No presente", Boolean(conB9.branch?.acceptance?.advisorNoteOnNo)],
  ["Sin datos dinámicos equipo", !conVdi.includes(EQ.brand) && !conVdi.includes(String(EQ.downPayment))],
];

console.log("\n--- BLOQUE 9 · CON EQUIPO ---\n");
console.log("Fase 1:", conB9.content);
console.log("\nFase 2 (VDI):", conVdi);
console.log("\nComparación Sin Equipo VDI:", sinVdi);
console.log("");

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}
if (failed) process.exitCode = 1;
