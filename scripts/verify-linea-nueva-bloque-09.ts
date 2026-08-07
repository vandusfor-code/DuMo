/** Verifica Bloque 9 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-09.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque09Encuesta,
  lineaNuevaBloque09Encuesta,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-09-encuesta";
import {
  LINEA_NUEVA_BLOQUE09_RAW22_ADVISOR_NOTE,
  LINEA_NUEVA_BLOQUE09_RAW22_HEADING,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-09-encuesta.constants";
import {
  LineaNuevaBloque09ValidationError,
  assertLineaNuevaBloque09Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-09-encuesta.validation";
import { buildBlock8SurveySpeech } from "../src/lib/sales-script/teleprompter/block8-survey-speech";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) =>
  ["plan-w", "plan-o", "plan-m"].includes(p.id),
);
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };
const DELIVERY_CONFIG = DEFAULT_DELIVERY_TELEPROMPTER_CONFIG;

function buildGestion(input: {
  planId: string;
  lineCount?: number;
  customerName?: string;
  deliveryType?: "home" | "store";
}): SaveLeadInput {
  const lineCount = input.lineCount ?? 1;
  return {
    conversationId: `conv-ln-b09-${input.planId}-${lineCount}`,
    phone: "56912345678",
    customerName: input.customerName ?? "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: Array.from({ length: lineCount }, (_, index) => ({
      phone: `5698765432${index}`,
      saleType: "new_line" as const,
      planId: input.planId,
      equipment: "none",
      equipmentMode: "without" as const,
      deliveryType: input.deliveryType ?? ("home" as const),
      email: "maria@test.cl",
      deliveryAddress: "Av. Providencia 123",
      region: "metropolitana",
      comuna: "Providencia",
      accountType: "postpaid" as const,
      deliveryCarrier: "ALAS" as const,
      pickupStoreId: input.deliveryType === "store" ? "wom-costanera" : "",
    })),
  };
}

function runScenario(label: string, gestion: SaveLeadInput): [string, boolean][] {
  const ctx = buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  });

  const step = buildLineaNuevaBloque09Encuesta(ctx);
  const firstName = (gestion.customerName ?? "").trim().split(/\s+/)[0] ?? "";
  const portSpeech = buildBlock8SurveySpeech({ clientFirstName: firstName });
  const postSpeech = step.branch?.npsSurvey?.postQuestionSpeech ?? "";

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico Portabilidad (pregunta)`, step.content === portSpeech.content],
    [`${label}: rama npsSurvey`, Boolean(step.branch?.npsSurvey?.postQuestionSpeech)],
    [`${label}: postSpeech idéntico Portabilidad`, postSpeech === portSpeech.branch?.npsSurvey?.postQuestionSpeech],
    [`${label}: nota asesora rama`, Boolean(step.branch?.npsSurvey?.advisorNoteBeforeContinue)],
    [`${label}: menciona primer nombre`, step.content.startsWith(`${firstName},`)],
    [`${label}: pregunta NPS inicial`, step.content.includes("¿Qué te pareció mi atención?")],
    [`${label}: escala 0 al 10`, postSpeech.includes("escala de evaluación del 0 al 10")],
    [`${label}: sin encabezado raw en content`, !step.content.includes(LINEA_NUEVA_BLOQUE09_RAW22_HEADING)],
    [`${label}: sin nota raw en content`, !step.content.includes(LINEA_NUEVA_BLOQUE09_RAW22_ADVISOR_NOTE)],
    [`${label}: sin placeholder`, !step.content.includes("XXX") && !step.content.includes("{{")],
  ];
}

const allChecks: [string, boolean][] = [];

for (const planId of ["plan-w", "plan-o", "plan-m"] as const) {
  allChecks.push(...runScenario(`Plan ${planId.toUpperCase()} · monolínea · domicilio`, buildGestion({ planId })));
}

allChecks.push(
  ...runScenario("Multilínea · Plan O · domicilio", buildGestion({ planId: "plan-o", lineCount: 2 })),
);
allChecks.push(
  ...runScenario("Retiro tienda · Plan O", buildGestion({ planId: "plan-o", deliveryType: "store" })),
);

const mono = buildLineaNuevaBloque09Encuesta(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
const multi = buildLineaNuevaBloque09Encuesta(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multi",
    gestion: buildGestion({ planId: "plan-o", lineCount: 3 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
allChecks.push(["Multilínea = monolínea (mismo cliente)", mono.content === multi.content]);
allChecks.push(
  [
    "Multilínea postSpeech = monolínea",
    mono.branch?.npsSurvey?.postQuestionSpeech === multi.branch?.npsSurvey?.postQuestionSpeech,
  ],
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b09-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque09Encuesta.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: {
    ...buildGestion({ planId: "plan-o" }),
    lines: [
      {
        ...buildGestion({ planId: "plan-o" }).lines[0],
        saleType: "portability",
        currentOperator: "movistar",
      },
    ],
  },
  commercialPlans: PLANS,
  deliveryConfig: DELIVERY_CONFIG,
  advisor: ADVISOR,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const lnStep = buildLineaNuevaBloque09Encuesta(lnCtx);
const portBlock8 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-8");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id encuesta", registered.id === "encuesta"],
  ["builder: label Encuesta", registered.label === "Encuesta"],
  ["builder: rama npsSurvey", Boolean(registered.branch?.npsSurvey?.postQuestionSpeech)],
  ["discurso idéntico Portabilidad bloque-8 (content)", lnStep.content === portBlock8?.content],
  [
    "discurso idéntico Portabilidad bloque-8 (postSpeech)",
    lnStep.branch?.npsSurvey?.postQuestionSpeech === portBlock8?.branch?.npsSurvey?.postQuestionSpeech,
  ],
  [
    "nota asesora idéntica Portabilidad",
    lnStep.branch?.npsSurvey?.advisorNoteBeforeContinue ===
      portBlock8?.branch?.npsSurvey?.advisorNoteBeforeContinue,
  ],
  [
    "LN usa buildBlock8SurveySpeech",
    lnStep.content === buildBlock8SurveySpeech({ clientFirstName: "María" }).content,
  ],
);

let missingName = false;
try {
  assertLineaNuevaBloque09Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid",
      gestion: buildGestion({ planId: "plan-o", customerName: "" }),
      commercialPlans: PLANS,
      advisor: ADVISOR,
      deliveryConfig: DELIVERY_CONFIG,
    }),
  );
} catch (error) {
  missingName =
    error instanceof LineaNuevaBloque09ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", missingName]);

console.log("\n--- BLOQUE 9 · LÍNEA NUEVA · ENCUESTA NPS ---\n");
console.log("Fase 1 (content):", lnStep.content, "\n");
console.log("Fase 2 (postQuestionSpeech):\n", lnStep.branch?.npsSurvey?.postQuestionSpeech, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
