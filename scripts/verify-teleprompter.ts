/**
 * Verificación de escenarios del teleprompter — ejecutar antes del commit:
 * npx tsx scripts/verify-teleprompter.ts
 */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import {
  buildContractDataValidationIntro,
  buildContractSummarySpeech,
} from "../src/lib/sales-script/contract-resumen";
import { computeTeleprompterMonthlyTotal } from "../src/lib/sales-script/teleprompter/contract-pricing";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { getTeleprompterContextError } from "../src/lib/sales-script/teleprompter/teleprompter-validation";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import { buildMultilineBenefitsSpeech } from "../src/lib/sales-script/teleprompter/speech-builders";
import { findUnresolvedPlaceholders } from "../src/lib/sales-script/teleprompter/speech-utils";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => ["plan-w", "plan-o", "plan-m"].includes(p.id));

function baseGestion(overrides: Partial<SaveLeadInput> & { lines: SaveLeadInput["lines"] }): SaveLeadInput {
  return {
    conversationId: "conv-test-001",
    phone: "56912345678",
    customerName: "Dulabs Test",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    ...overrides,
    lines: overrides.lines,
  };
}

function line(
  index: number,
  planId: string,
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
    equipment: "",
    equipmentMode: "none",
    currentOperator: "movistar",
    deliveryType: opts?.deliveryType ?? "home",
    email: "dulabs@test.cl",
    deliveryAddress: "Av. Test 123",
    region: "metropolitana",
    comuna: "Providencia",
    equipmentCatalogId: "",
    equipmentModel: "",
    equipmentValue: "",
    equipmentDownPayment: "",
    equipmentInstallments: "",
    equipmentInstallmentValue: "",
    equipmentCommercialText: "",
    accountType: opts?.accountType ?? "postpaid",
    isUpselling: opts?.isUpselling,
  };
}

const SCENARIOS: { name: string; gestion: SaveLeadInput; expectNull?: boolean }[] = [
  {
    name: "1 línea — Plan O",
    gestion: baseGestion({ lines: [line(0, "plan-o")] }),
  },
  {
    name: "1 línea — Plan W",
    gestion: baseGestion({ lines: [line(0, "plan-w")] }),
  },
  {
    name: "1 línea — Plan M",
    gestion: baseGestion({ lines: [line(0, "plan-m")] }),
  },
  {
    name: "2 líneas — mismo plan (Plan O)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-o")] }),
  },
  {
    name: "3 líneas — mismo plan (Plan O)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-o"), line(2, "plan-o")] }),
  },
  {
    name: "2 líneas — planes distintos (O + M)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-m")] }),
  },
  {
    name: "3 líneas — planes distintos (O + W + M)",
    gestion: baseGestion({ lines: [line(0, "plan-o"), line(1, "plan-w"), line(2, "plan-m")] }),
    expectNull: true,
  },
  {
    name: "Upselling / homologación",
    gestion: baseGestion({ lines: [line(0, "plan-o", { isUpselling: true })] }),
  },
  {
    name: "Prepago → Postpago — Plan O",
    gestion: baseGestion({ lines: [line(0, "plan-o", { accountType: "prepaid" })] }),
  },
  {
    name: "1 línea — Plan O — retiro tienda",
    gestion: baseGestion({ lines: [line(0, "plan-o", { deliveryType: "store" })] }),
  },
  {
    name: "Sin tipo de entrega — inválido",
    gestion: baseGestion({ lines: [line(0, "plan-o", { deliveryType: "" })] }),
    expectNull: true,
  },
  {
    name: "Plan W multilínea — inválido",
    gestion: baseGestion({ lines: [line(0, "plan-w"), line(1, "plan-w")] }),
    expectNull: true,
  },
  {
    name: "PlanId inexistente — inválido",
    gestion: baseGestion({ lines: [line(0, "xs")] }),
    expectNull: true,
  },
];

let failed = 0;

for (const scenario of SCENARIOS) {
  console.log("\n" + "=".repeat(72));
  console.log(`ESCENARIO: ${scenario.name}`);
  console.log("=".repeat(72));

  const ctx = buildScriptContext({
    gestion: scenario.gestion,
    commercialPlans: PLANS,
    advisor: { name: "María Asesora", email: "maria@wom.cl" },
  });

  if (scenario.expectNull) {
    const error = getTeleprompterContextError({
      gestion: scenario.gestion,
      commercialPlans: PLANS,
      deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
    });
    console.log(ctx ? "❌ Se esperaba contexto nulo" : "✅ Contexto rechazado correctamente");
    if (error) console.log(`   Motivo: ${error}`);
    if (ctx) failed++;
    continue;
  }

  if (!ctx) {
    console.error("❌ No se pudo construir contexto");
    failed++;
    continue;
  }

  const intro = buildContractDataValidationIntro(ctx);
  const contratacion = buildContractSummarySpeech(ctx);
  const beneficios = buildMultilineBenefitsSpeech(ctx.vars.nombre_cliente, ctx.lineDetails);
  const blocks = buildTeleprompterBlocks(ctx);
  const block3 = blocks.find((b) => b.id === "bloque-3");
  const block5 = blocks.find((b) => b.id === "bloque-5");
  const block6 = blocks.find((b) => b.id === "bloque-6");
  const block7 = blocks.find((b) => b.id === "bloque-7");
  const block8 = blocks.find((b) => b.id === "bloque-8");
  const block9 = blocks.find((b) => b.id === "bloque-9");
  const block10 = blocks.find((b) => b.id === "bloque-10");
  const block11 = blocks.find((b) => b.id === "bloque-11");
  const block12 = blocks.find((b) => b.id === "bloque-12");
  const condicionesEntrega = block5?.content ?? "";
  const portabilidad = block6?.content ?? "";
  const regalo = block7?.content ?? "";
  const encuesta = block8?.content ?? "";
  const aceptacion = block9?.content ?? "";
  const prefijo809 = block10?.content ?? "";
  const referido = block11?.content ?? "";
  const despedida = block12?.content ?? "";

  console.log("\n--- BLOQUE 3 · VALIDACIÓN DATOS ---\n");
  console.log(intro);

  console.log("\n--- BLOQUE 3 · RESUMEN CONTRATACIÓN ---\n");
  console.log(contratacion);

  console.log("\n--- BLOQUE 4 · BENEFICIOS ---\n");
  console.log(beneficios);

  console.log("\n--- BLOQUE 5 · CONDICIONES Y ENTREGA ---\n");
  console.log(condicionesEntrega);

  console.log("\n--- BLOQUE 6 · PORTABILIDAD ---\n");
  console.log(portabilidad);

  console.log("\n--- BLOQUE 7 · REGALO ---\n");
  console.log(regalo);

  console.log("\n--- BLOQUE 12 · DESPEDIDA ---\n");
  console.log(despedida);

  const allSpeech =
    intro +
    contratacion +
    beneficios +
    condicionesEntrega +
    portabilidad +
    regalo +
    encuesta +
    aceptacion +
    prefijo809 +
    referido +
    despedida;

  const expectedTotal = computeTeleprompterMonthlyTotal(ctx.lineDetails, ctx.planDetail);
  const totalInSpeech = contratacion.includes(ctx.vars.total_mensual);
  const isPrepaid = scenario.gestion.lines[0]?.accountType === "prepaid";

  const checks: [string, boolean][] = [
    ["Sin placeholders", findUnresolvedPlaceholders(allSpeech).length === 0],
    ["Apertura oficial", intro.startsWith("Continuamos con un breve resumen")],
    ["Pregunta datos antes del resumen", intro.includes("¿Son correctos tus datos?")],
    ["Resumen no incluido en intro", !intro.includes("Según las condiciones acordadas")],
    [
      "Monto mensual oficial",
      contratacion.includes("por un valor mensual de") || contratacion.includes("monto a pagar de"),
    ],
    ["Bloque 3 con rama dataValidation", Boolean(block3?.branch?.dataValidation)],
    ["Total mensual coherente", ctx.totalMonthly === expectedTotal && totalInSpeech],
    ["12 bloques generados", blocks.length === 12],
    ["B4 sin bullets", !beneficios.includes("•")],
    ["B4 menciona plan contratado", beneficios.includes("que acabas de contratar")],
    ["B4 sin tu servicio incluye", !beneficios.includes("tu servicio incluye")],
    ["B4 sin líneas adicionales comerciales", !/líneas adicionales por/i.test(beneficios)],
    ["B4 sin boletas $0", !beneficios.includes("boleta $0")],
    ["B4 sin cupón detallado", !beneficios.includes("cupón del")],
    ["B4 sin frases genéricas comerciales", !beneficios.includes("Como parte de la oferta vigente")],
    ["B5 condiciones generales", condicionesEntrega.includes("mail de bienvenida")],
    ["B5 compatibilidad equipos", condicionesEntrega.includes("sello-multibandas")],
    ["B5 contratos Bienvenido a Wom", condicionesEntrega.includes("Bienvenido a Wom")],
    ["B5 sin Ultra Express", !condicionesEntrega.includes("Ultra Express")],
    ["B5 sin instrucciones internas", !condicionesEntrega.includes("INFORMAR AL CLIENTE")],
    ["B6 apertura oficial", portabilidad.includes("Te explico un poco como funciona el proceso de portabilidad.")],
    ["B6 línea 41 completa", portabilidad.includes("valida que sea tu número portado") && portabilidad.includes("navegar por internet") && portabilidad.includes("me puedas escribir")],
    ["B6 operador dinámico", portabilidad.includes("Movistar")],
    ["B6 pregunta oficial porta", portabilidad.includes("¿Alguna duda con el proceso de porta?")],
    ["B6 sin portabilidad en pregunta", !portabilidad.includes("¿Alguna duda con el proceso de portabilidad?")],
    ["B6 número temporal integrado", portabilidad.includes("número temporal") && !portabilidad.includes("NÚMERO TEMPORAL (PROVISORIO)")],
    ["B6 rama dudas nota asesora", Boolean(block6?.branch?.portabilityProcess?.advisorNoteOnYes)],
    ["B6 sin yesSpeech inventado", !block6?.branch?.yesSpeech],
    ["B7 chip regalo oficial", regalo.includes("te regalamos un chip prepago")],
    ["B7 sin encuesta mezclada", !regalo.includes("¿Qué te pareció mi atención?")],
    ["B8 encuesta fase 1", encuesta.includes("¿Qué te pareció mi atención?")],
    ["B8 encuesta dos fases", Boolean(block8?.branch?.npsSurvey?.postQuestionSpeech)],
    ["B8 invitación exacta", (block8?.branch?.npsSurvey?.postQuestionSpeech ?? "").includes("Recibirás una encuesta de satisfacción en tu correo electrónico una vez recibas tu producto")],
    ["B8 sin escala NPS en llamada", !(block8?.branch?.npsSurvey?.postQuestionSpeech ?? "").includes("escala de evaluación")],
    ["B8 sin encuesta en vivo", !(block8?.branch?.npsSurvey?.postQuestionSpeech ?? "").includes("Pensando únicamente")],
    ["B9 aceptación condiciones", aceptacion.includes("¿te queda alguna duda con las condiciones entregadas?")],
    ["B9 nota dudas asesora", Boolean(block9?.branch?.condicionesDudas?.advisorNoteOnYes)],
    ["B9 VDI separado", Boolean(block9?.branch?.acceptance?.postCondicionesSpeech)],
    ["B9 sin aclarar inventado", !block9?.branch?.condicionesDudas?.yesSpeech],
    ["B10 prefijo 809 pregunta", prefijo809.includes("llamadas Spam o no deseadas")],
    ["B10 rama consulta", Boolean(block10?.branch?.prefijo809?.consultaSpeech)],
    ["B10 nota formulario", Boolean(block10?.branch?.prefijo809?.advisorNoteOnYes)],
    ["B11 referido oficial", referido.includes("me gustaría saber si conoces a alguien")],
    ["B11 sin pregunta extra", !referido.includes("¿Me podrías compartir")],
    ["B11 nota referido", Boolean(block11?.branch?.referral?.advisorNote)],
    ["B12 despedida oficial", despedida.includes("Bienvenido a WOM, que tengas un excelente día!")],
    ["B12 correo ejecutivo", despedida.includes("maria@wom.cl")],
  ];

  if (isPrepaid) {
    checks.push(["B6 CAP prepago", portabilidad.includes("código CAP")]);
    checks.push(["B6 rama CAP", Boolean(block6?.branch?.cap)]);
    checks.push(["B6 CAP sin nombre en pregunta", !portabilidad.includes(", Te envié un SMS")]);
  } else if (!scenario.name.includes("Upselling")) {
    checks.push(["B6 postpago sin CAP", !portabilidad.includes("código CAP")]);
    checks.push(["B6 postpago sin rama CAP", !block6?.branch?.cap]);
  }

  if (scenario.name.includes("Upselling")) {
    checks.push(["Solo discurso homologación", contratacion.includes("modificar el plan actual")]);
    checks.push(["Sin doble portabilidad estándar", !contratacion.includes("proveniente de la compañía")]);
  } else {
    checks.push(["Con fecha en contratación", contratacion.includes("con fecha")]);
    checks.push(["Disclaimer cumplas", contratacion.includes("cumplas con las condiciones")]);
  }

  if (scenario.name.includes("2 líneas — mismo plan")) {
    checks.push(["Adicional $7.990", contratacion.includes("$7.990")]);
    checks.push(["Total $21.980", contratacion.includes("$21.980")]);
    checks.push([
      "B4 cierre multilínea homogénea",
      beneficios.includes(
        "Estos beneficios estarán disponibles para todas las líneas contratadas bajo ese mismo plan.",
      ),
    ]);
  }

  if (scenario.name.includes("retiro tienda")) {
    checks.push(["B5 retiro tienda", condicionesEntrega.includes("Listo para tu retiro")]);
    checks.push(["B5 acercarse a sucursal", condicionesEntrega.includes("acercarte a la sucursal Wom")]);
    checks.push(["B5 sin domicilio", !condicionesEntrega.includes("Tu Compra va en Camino")]);
  } else if (!scenario.name.includes("retiro")) {
    checks.push(["B5 despacho domicilio", condicionesEntrega.includes("Tu Compra va en Camino")]);
    checks.push(["B5 OTP RAYO/ALAS", condicionesEntrega.includes("RAYO") && condicionesEntrega.includes("ALAS/SROUTE")]);
  }

  if (scenario.name.includes("Plan O") && scenario.name.includes("1 línea") && !scenario.name.includes("retiro")) {
    checks.push(["B4 referencia valor mensual", beneficios.includes("por un valor mensual de")]);
    checks.push(["B4 Club WOM natural", beneficios.includes("Club WOM desde el primer día")]);
    checks.push([
      "B4 Club WOM conversacional",
      beneficios.includes("donde podrás disfrutar de descuentos y beneficios exclusivos en comercios asociados como"),
    ]);
    checks.push(["B4 roaming +100 países", beneficios.includes("más de 100 países")]);
    checks.push(["B4 cupón equipos", beneficios.includes("cupón de descuento para la compra de equipos y accesorios")]);
    checks.push(["B4 cuota gratis dinámica", beneficios.includes("la última cuota será completamente gratis")]);
    checks.push(["B4 conectores variados", (beneficios.match(/^Además,/gm) ?? []).length <= 1]);
  }

  if (scenario.name.includes("Plan W") && scenario.name.includes("1 línea")) {
    checks.push(["B4 sin párrafo comercial", !beneficios.includes("cupón de descuento") && !beneficios.includes("cuota será completamente gratis")]);
  }

  if (scenario.name.includes("Plan M") && scenario.name.includes("1 línea")) {
    checks.push(["B4 PedidosYa al cierre", beneficios.includes("PedidosYa Plus")]);
    checks.push(["B4 PedidosYa condiciones catálogo", beneficios.includes("Incluido sin costo adicional por 12 meses")]);
    checks.push(["B4 cupón equipos", beneficios.includes("cupón de descuento para la compra de equipos y accesorios")]);
    checks.push(["B4 cuotas gratis dinámicas", beneficios.includes("las dos últimas cuotas serán completamente gratis")]);
    checks.push(["B4 conectores variados", beneficios.includes("También ") && beneficios.includes("Por otra parte,")]);
  }

  if (scenario.name.includes("O + M")) {
    checks.push(["B4 heterogéneo por plan", beneficios.includes("línea principal") && beneficios.includes("línea adicional")]);
  }

  console.log("\n--- VALIDACIONES ---");
  for (const [label, ok] of checks) {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) failed++;
  }
}

console.log("\n" + "=".repeat(72));
console.log(failed === 0 ? "✅ Todos los escenarios pasaron" : `❌ ${failed} validación(es) fallida(s)`);
console.log("=".repeat(72));

process.exit(failed > 0 ? 1 : 0);
