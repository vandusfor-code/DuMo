/**
 * Auditoría funcional — Portabilidad con Equipo (12 bloques).
 * Ejecutar: npx tsx scripts/verify-teleprompter-con-equipo.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { EQUIPMENT_CATALOG_MOCK } from "../src/data/mock/equipment.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildContractDataValidationIntro } from "../src/lib/sales-script/contract-resumen";
import { buildPortabilidadConEquipoFlow } from "../src/lib/sales-script/flows/portabilidad-con-equipo.flow";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { buildTeleprompterBlocksConEquipo } from "../src/lib/sales-script/teleprompter/blocks-con-equipo";
import { buildBlock3ContractSummaryConEquipoSpeech } from "../src/lib/sales-script/teleprompter/block3-contract-summary-con-equipo-speech";
import { getTeleprompterContextError } from "../src/lib/sales-script/teleprompter/teleprompter-validation";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import { findUnresolvedPlaceholders } from "../src/lib/sales-script/teleprompter/speech-utils";
import type { EquipmentCatalogItem } from "../src/types/equipment";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));
const EQ_PIE = EQUIPMENT_CATALOG_MOCK[0];
const EQ_ZERO_PIE: EquipmentCatalogItem = {
  ...EQUIPMENT_CATALOG_MOCK[1],
  id: "eq-zero-pie",
  downPayment: 0,
};
const EQUIPMENT_CATALOG = [...EQUIPMENT_CATALOG_MOCK, EQ_ZERO_PIE];

const VDI_CON_EQUIPO =
  "Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad aceptas las condiciones de estos contratos, es decir, tanto del contrato de servicios móvil como el de compraventa del equipo financiado. ¿Lo aceptas?";

function baseGestion(overrides: Partial<SaveLeadInput> & { lines: SaveLeadInput["lines"] }): SaveLeadInput {
  return {
    conversationId: "conv-con-equipo-test",
    phone: "56912345678",
    customerName: "Dulabs Test",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    ...overrides,
    lines: overrides.lines,
  };
}

function equipLine(
  index: number,
  planId: string,
  equipment: EquipmentCatalogItem,
  opts?: {
    isUpselling?: boolean;
    accountType?: "prepaid" | "postpaid";
    deliveryType?: "home" | "store" | "";
  },
): SaveLeadInput["lines"][number] {
  return {
    phone: `5691234567${index}`,
    saleType: "portability",
    planId,
    equipment: equipment.commercialName,
    equipmentMode: "with",
    currentOperator: "movistar",
    deliveryType: opts?.deliveryType ?? "home",
    email: "dulabs@test.cl",
    deliveryAddress: "Av. Test 123",
    region: "metropolitana",
    comuna: "Providencia",
    equipmentCatalogId: equipment.id,
    equipmentModel: `${equipment.brand} ${equipment.model}`,
    equipmentValue: String(equipment.totalValue),
    equipmentDownPayment: String(equipment.downPayment),
    equipmentInstallments: String(equipment.installmentsCount),
    equipmentInstallmentValue: String(equipment.installmentValue),
    equipmentCommercialText: equipment.commercialText,
    accountType: opts?.accountType ?? "postpaid",
    isUpselling: opts?.isUpselling,
  };
}

type Scenario = {
  name: string;
  gestion: SaveLeadInput;
  equipment: EquipmentCatalogItem;
  expectNull?: boolean;
};

const SCENARIOS: Scenario[] = [
  { name: "1 línea Plan O — pie > 0 — domicilio", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE)] }), equipment: EQ_PIE },
  { name: "1 línea Plan O — pie $0 — domicilio", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_ZERO_PIE)] }), equipment: EQ_ZERO_PIE },
  { name: "1 línea Plan W — pie > 0", gestion: baseGestion({ lines: [equipLine(0, "plan-w", EQ_PIE)] }), equipment: EQ_PIE },
  { name: "1 línea Plan M — pie > 0", gestion: baseGestion({ lines: [equipLine(0, "plan-m", EQ_PIE)] }), equipment: EQ_PIE },
  { name: "2 líneas — mismo plan O", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE), equipLine(1, "plan-o", EQ_PIE)] }), equipment: EQ_PIE },
  { name: "2 líneas — planes distintos O + M", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE), equipLine(1, "plan-m", EQ_PIE)] }), equipment: EQ_PIE },
  { name: "Upselling / homologación", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE, { isUpselling: true })] }), equipment: EQ_PIE },
  { name: "Prepago → Postpago — Plan O", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE, { accountType: "prepaid" })] }), equipment: EQ_PIE },
  { name: "Retiro en tienda — Plan O", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE, { deliveryType: "store" })] }), equipment: EQ_PIE },
  { name: "Sin tipo de entrega — inválido", gestion: baseGestion({ lines: [equipLine(0, "plan-o", EQ_PIE, { deliveryType: "" })] }), equipment: EQ_PIE, expectNull: true },
  { name: "Plan W multilínea — inválido", gestion: baseGestion({ lines: [equipLine(0, "plan-w", EQ_PIE), equipLine(1, "plan-w", EQ_PIE)] }), equipment: EQ_PIE, expectNull: true },
  { name: "PlanId inexistente — inválido", gestion: baseGestion({ lines: [equipLine(0, "xs", EQ_PIE)] }), equipment: EQ_PIE, expectNull: true },
];

const EXPECTED_BLOCK_IDS = Array.from({ length: 12 }, (_, i) => `bloque-${i + 1}`);

let failed = 0;

for (const scenario of SCENARIOS) {
  console.log("\n" + "=".repeat(72));
  console.log(`ESCENARIO: ${scenario.name}`);
  console.log("=".repeat(72));

  const validationError = getTeleprompterContextError({
    gestion: scenario.gestion,
    commercialPlans: PLANS,
    equipmentCatalog: EQUIPMENT_CATALOG,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });

  const ctx = buildScriptContext({
    gestion: scenario.gestion,
    commercialPlans: PLANS,
    equipmentCatalog: EQUIPMENT_CATALOG,
    advisor: { name: "María Asesora", email: "maria@wom.cl" },
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });

  if (scenario.expectNull) {
    console.log(ctx ? "❌ Se esperaba contexto nulo" : "✅ Contexto rechazado correctamente");
    if (validationError) console.log(`   Motivo: ${validationError}`);
    if (ctx) failed++;
    continue;
  }

  if (!ctx) {
    console.error("❌ No se pudo construir contexto");
    if (validationError) console.log(`   Motivo: ${validationError}`);
    failed++;
    continue;
  }

  const blocks = buildTeleprompterBlocksConEquipo(ctx);
  const flowBlocks = buildPortabilidadConEquipoFlow(ctx);
  const sinCtx = buildScriptContext({
    gestion: {
      ...scenario.gestion,
      lines: scenario.gestion.lines.map((l) => ({
        ...l,
        equipment: "none",
        equipmentMode: "without" as const,
        equipmentCatalogId: "",
        equipmentModel: "",
        equipmentValue: "",
        equipmentDownPayment: "",
        equipmentInstallments: "",
        equipmentInstallmentValue: "",
        equipmentCommercialText: "",
      })),
    },
    commercialPlans: PLANS,
    advisor: { name: "María Asesora", email: "maria@wom.cl" },
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  const sinBlocks = sinCtx ? buildTeleprompterBlocks(sinCtx) : [];

  const byId = (id: string) => blocks.find((b) => b.id === id);
  const sinById = (id: string) => sinBlocks.find((b) => b.id === id);

  const intro = buildContractDataValidationIntro(ctx);
  const contratacion = buildBlock3ContractSummaryConEquipoSpeech(ctx);
  const b3 = byId("bloque-3");
  const b4 = byId("bloque-4")?.content ?? "";
  const b5 = byId("bloque-5")?.content ?? "";
  const b6 = byId("bloque-6");
  const b7 = byId("bloque-7")?.content ?? "";
  const b8 = byId("bloque-8");
  const b9 = byId("bloque-9");
  const b10 = byId("bloque-10");
  const b11 = byId("bloque-11");
  const b12 = byId("bloque-12")?.content ?? "";

  const allSpeech = blocks.map((b) => b.content).join("\n") +
    (b3?.branch?.dataValidation?.postValidationSpeech ?? "") +
    (b6?.branch?.cap?.yesSpeech ?? "") +
    (b8?.branch?.npsSurvey?.postQuestionSpeech ?? "") +
    (b9?.branch?.acceptance?.postCondicionesSpeech ?? "") +
    (b10?.branch?.prefijo809?.yesSpeech ?? "");

  const isPrepaid = scenario.gestion.lines[0]?.accountType === "prepaid";
  const pieZero = scenario.equipment.downPayment === 0;

  const checks: [string, boolean][] = [
    ["Registry/flujo: 12 bloques vía flow", flowBlocks.length === 12],
    ["Builder: 12 bloques generados", blocks.length === 12],
    ["Persistencia: IDs bloque-1…12", EXPECTED_BLOCK_IDS.every((id) => blocks.some((b) => b.id === id))],
    ["Persistencia: sectionLabel en todos", blocks.every((b) => Boolean(b.sectionLabel))],
    ["Persistencia: content no vacío", blocks.every((b) => b.content.trim().length > 0)],
    ["Sin placeholders", findUnresolvedPlaceholders(allSpeech).length === 0],
    ["B3 intro datos", intro.includes("¿Son correctos tus datos?")],
    ["B3 rama dataValidation", Boolean(b3?.branch?.dataValidation?.postValidationSpeech)],
    ["B3 resumen con equipo", contratacion.includes("Adicionalmente llevarás el equipo")],
    ["B3 sin explicados", !contratacion.includes("beneficios explicados")],
    ["B4 desde catálogo comercial", b4.length > 0 && !b4.includes("{{")],
    ["B4 sin nombre cliente", !b4.includes("Dulabs Test")],
    ["B5 mail bienvenida", b5.includes("mail de bienvenida")],
    ["B5 sin multibandas", !b5.includes("sello-multibandas")],
    ["B5 sin Ultra Express", !b5.includes("Ultra Express")],
    ["B5 Bienvenido a Wom", b5.includes("Bienvenido a Wom")],
    ["B6 transversal idéntico Sin Equipo", b6?.content === sinById("bloque-6")?.content],
    ["B7 transversal idéntico Sin Equipo", b7 === sinById("bloque-7")?.content],
    ["B8 transversal idéntico Sin Equipo", b8?.content === sinById("bloque-8")?.content],
    ["B8 rama npsSurvey", Boolean(b8?.branch?.npsSurvey?.postQuestionSpeech)],
    ["B9 fase 1 dudas", (b9?.content ?? "").includes("¿te queda alguna duda con las condiciones entregadas?")],
    ["B9 VDI dos contratos", b9?.branch?.acceptance?.postCondicionesSpeech === VDI_CON_EQUIPO],
    ["B9 sin este contrato", !(b9?.branch?.acceptance?.postCondicionesSpeech ?? "").includes("este contrato")],
    ["B9 rama condicionesDudas", Boolean(b9?.branch?.condicionesDudas?.advisorNoteOnYes)],
    ["B9 rama acceptance", Boolean(b9?.branch?.acceptance?.advisorNoteOnNo)],
    ["B10 transversal idéntico Sin Equipo", b10?.content === sinById("bloque-10")?.content],
    ["B10 rama prefijo809 completa", Boolean(b10?.branch?.prefijo809?.consultaSpeech && b10?.branch?.prefijo809?.advisorNoteOnYes)],
    ["B11 transversal idéntico Sin Equipo", b11?.content === sinById("bloque-11")?.content],
    ["B11 nota referido", Boolean(b11?.branch?.referral?.advisorNote)],
    ["B12 transversal idéntico Sin Equipo", b12 === sinById("bloque-12")?.content],
    ["B12 correo ejecutivo", b12.includes("maria@wom.cl")],
    ["B12 nombre ejecutivo", b12.includes("María Asesora")],
    ["Catálogo equipos resuelto", contratacion.includes(scenario.equipment.brand)],
  ];

  if (pieZero) {
    checks.push(["Pie $0: sin pago inicial", contratacion.includes("sin pago inicial")]);
    checks.push(["Pie $0: sin link 24h", !contratacion.includes("link para que puedas realizar el pago")]);
    checks.push(["B5 pie $0: sin garantía link", !b5.includes("Dentro del link de pago encontrarás")]);
  } else {
    checks.push(["Pie > 0: pago inicial", contratacion.includes("pago inicial es de")]);
    checks.push(["Pie > 0: link 24h", contratacion.includes("link para que puedas realizar el pago de tu equipo en máximo 24 horas")]);
    checks.push(["B5 pie > 0: garantía equipo", b5.includes("Dentro del link de pago encontrarás")]);
  }

  if (isPrepaid) {
    checks.push(["Prepago: CAP en B6", (b6?.content ?? "").includes("código CAP")]);
    checks.push(["Prepago: rama cap", Boolean(b6?.branch?.cap)]);
  } else if (!scenario.name.includes("Upselling")) {
    checks.push(["Postpago: sin CAP", !(b6?.content ?? "").includes("código CAP")]);
    checks.push(["Postpago: sin rama cap", !b6?.branch?.cap]);
  }

  if (scenario.name.includes("Retiro en tienda")) {
    checks.push(["B5 retiro tienda", b5.includes("Listo para tu retiro")]);
    checks.push(["B5 sin domicilio", !b5.includes("Tu Compra va en Camino")]);
  } else if (!scenario.name.includes("inválido")) {
    checks.push(["B5 domicilio", b5.includes("Tu Compra va en Camino")]);
    checks.push(["B5 OTP WhatsApp", b5.includes("WhatsApp (RAYO)")]);
  }

  if (scenario.name.includes("2 líneas — mismo plan")) {
    checks.push(["Multilínea: adicional $7.990", contratacion.includes("$7.990")]);
  }

  if (scenario.name.includes("Upselling")) {
    checks.push(["Upselling: modificar plan", contratacion.includes("modificar el plan actual")]);
    checks.push(["Upselling: sin disclaimer portabilidad", !contratacion.includes("beneficios ofrecidos quedarán sin efecto")]);
  } else {
    checks.push(["B3 disclaimer ofrecidos", contratacion.includes("beneficios ofrecidos quedarán sin efecto")]);
  }

  if (scenario.name.includes("Plan O") && scenario.name.includes("1 línea") && scenario.name.includes("pie > 0")) {
    checks.push(["B4 Plan O oficial", b4.includes("300 Gigas") || b4.includes("PLAN SIMPLE O")]);
  }

  console.log("\n--- VALIDACIONES ---");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) failed++;
  }
}

console.log("\n" + "=".repeat(72));
console.log(failed === 0 ? "✅ Auditoría Portabilidad con Equipo: todos los escenarios pasaron" : `❌ ${failed} validación(es) fallida(s)`);
console.log("=".repeat(72));

process.exit(failed > 0 ? 1 : 0);
