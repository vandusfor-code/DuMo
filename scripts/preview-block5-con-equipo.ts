/**
 * Vista previa del Bloque 5 — Portabilidad con Equipo (solo local, no commit).
 * npx tsx scripts/preview-block5-con-equipo.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildBlock5CondicionesEntregaConEquipoSpeech } from "../src/lib/sales-script/teleprompter/block5-condiciones-entrega-con-equipo-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const EQ = EQUIPMENT_CATALOG_MOCK[0];
const EQ_ZERO = { ...EQ, id: "eq-zero-pie", downPayment: 0 };
const CATALOG = [...EQUIPMENT_CATALOG_MOCK, EQ_ZERO];

function equipmentLine(
  deliveryType: "home" | "store",
  downPayment: number,
  equipmentId: string,
): SaveLeadInput["lines"][number] {
  const item = equipmentId === EQ_ZERO.id ? EQ_ZERO : EQ;
  return {
    phone: "56912345670",
    saleType: "portability",
    planId: "plan-o",
    equipment: item.commercialName,
    equipmentMode: "with",
    currentOperator: "movistar",
    deliveryType,
    email: "cliente@test.cl",
    deliveryAddress: "Av. Providencia 123",
    region: "metropolitana",
    comuna: "Providencia",
    equipmentCatalogId: equipmentId,
    equipmentModel: `${item.brand} ${item.model}`.trim(),
    equipmentValue: String(item.totalValue),
    equipmentDownPayment: String(downPayment),
    equipmentInstallments: String(item.installmentsCount),
    equipmentInstallmentValue: String(item.installmentValue),
    equipmentCommercialText: item.commercialText,
    accountType: "postpaid",
  };
}

function gestion(line: SaveLeadInput["lines"][number]): SaveLeadInput {
  return {
    conversationId: "conv-preview-b5",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [line],
  };
}

function printScenario(title: string, input: SaveLeadInput) {
  const ctx = buildScriptContext({
    gestion: input,
    commercialPlans: PLANS,
    equipmentCatalog: CATALOG,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx) throw new Error(`Contexto nulo: ${title}`);

  const speech = buildBlock5CondicionesEntregaConEquipoSpeech(ctx);
  const hasLink = /link de pago/i.test(speech);
  const hasGarantia = /garantías que tiene tu equipo/i.test(speech);
  const hasCompat = /sello-multibandas/i.test(speech);
  const hasUltra = /Ultra Express|NOMAD 3 horas/i.test(speech);

  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
  console.log(speech);
  console.log("\n--- Checks ---");
  console.log(`link de pago: ${hasLink ? "SÍ" : "NO"}`);
  console.log(`garantía equipo: ${hasGarantia ? "SÍ" : "NO"}`);
  console.log(`compatibilidad multibandas: ${hasCompat ? "SÍ (error)" : "NO"}`);
  console.log(`ultra express: ${hasUltra ? "SÍ (error)" : "NO"}`);
}

printScenario(
  "Despacho domicilio + pie $0",
  gestion(equipmentLine("home", 0, EQ_ZERO.id)),
);
printScenario(
  "Despacho domicilio + pie mayor a $0",
  gestion(equipmentLine("home", EQ.downPayment, EQ.id)),
);
printScenario(
  "Retiro en tienda + pie $0",
  gestion(equipmentLine("store", 0, EQ_ZERO.id)),
);
printScenario(
  "Retiro en tienda + pie mayor a $0",
  gestion(equipmentLine("store", EQ.downPayment, EQ.id)),
);
