/** Verifica Bloque 11 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-11.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque11Prefijo809,
  lineaNuevaBloque11Prefijo809,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-11-prefijo-809";
import {
  LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE,
  LINEA_NUEVA_BLOQUE11_RAW26_EXPLICIT_YES_RULE,
  LINEA_NUEVA_BLOQUE11_RAW26_HEADING,
  LINEA_NUEVA_BLOQUE11_RAW26_PORTABILITY_NOTE,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-11-prefijo-809.constants";
import {
  LineaNuevaBloque11ValidationError,
  assertLineaNuevaBloque11Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-11-prefijo-809.validation";
import { buildBlock10Prefijo809Speech } from "../src/lib/sales-script/teleprompter/block10-prefijo809-speech";
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
    conversationId: `conv-ln-b11-${input.planId}-${lineCount}`,
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

  const step = buildLineaNuevaBloque11Prefijo809(ctx);
  const firstName = (gestion.customerName ?? "").trim().split(/\s+/)[0] ?? "";
  const portStep = buildBlock10Prefijo809Speech({ clientFirstName: firstName });
  const branch = step.branch?.prefijo809;
  const portBranch = portStep.branch?.prefijo809;

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: content idéntico Portabilidad`, step.content === portStep.content],
    [`${label}: rama prefijo809`, Boolean(branch)],
    [`${label}: nota LN raw [26]`, branch?.advisorNoteOnBlockStart === LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE],
    [
      `${label}: nota LN ≠ nota Port`,
      branch?.advisorNoteOnBlockStart !== portBranch?.advisorNoteOnBlockStart,
    ],
    [`${label}: sin nota portabilidad en advisorNote`, !branch?.advisorNoteOnBlockStart?.includes("portabilidad")],
    [`${label}: yesSpeech idéntico Port`, branch?.yesSpeech === portBranch?.yesSpeech],
    [`${label}: noSpeech idéntico Port`, branch?.noSpeech === portBranch?.noSpeech],
    [`${label}: followUpNoSpeech idéntico Port`, branch?.followUpNoSpeech === portBranch?.followUpNoSpeech],
    [`${label}: consultaSpeech idéntico Port`, branch?.consultaSpeech === portBranch?.consultaSpeech],
    [`${label}: advisorNoteOnYes idéntico Port`, branch?.advisorNoteOnYes === portBranch?.advisorNoteOnYes],
    [`${label}: menciona primer nombre`, step.content.startsWith(`${firstName},`)],
    [`${label}: pregunta spam`, step.content.includes("llamadas Spam o no deseadas")],
    [`${label}: sin encabezado raw`, !step.content.includes(LINEA_NUEVA_BLOQUE11_RAW26_HEADING)],
    [`${label}: sin nota port en content`, !step.content.includes(LINEA_NUEVA_BLOQUE11_RAW26_PORTABILITY_NOTE)],
    [`${label}: sin regla SÍ explícito en content`, !step.content.includes(LINEA_NUEVA_BLOQUE11_RAW26_EXPLICIT_YES_RULE)],
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

const mono = buildLineaNuevaBloque11Prefijo809(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
const multi = buildLineaNuevaBloque11Prefijo809(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multi",
    gestion: buildGestion({ planId: "plan-o", lineCount: 3 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
allChecks.push(["Multilínea = monolínea (content)", mono.content === multi.content]);
allChecks.push(
  [
    "Multilínea nota asesora = monolínea",
    mono.branch?.prefijo809?.advisorNoteOnBlockStart ===
      multi.branch?.prefijo809?.advisorNoteOnBlockStart,
  ],
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b11-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque11Prefijo809.register({ ctx: lnCtx, flags: ruleFlags, builder });
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

const lnStep = buildLineaNuevaBloque11Prefijo809(lnCtx);
const portBlock10 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-10");
const portBranch = portBlock10?.branch?.prefijo809;
const lnBranch = lnStep.branch?.prefijo809;

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id prefijo_809", registered.id === "prefijo_809"],
  ["builder: label Prefijo 809", registered.label === "Prefijo 809"],
  ["builder: rama prefijo809", Boolean(registered.branch?.prefijo809?.yesSpeech)],
  ["content idéntico Portabilidad bloque-10", lnStep.content === portBlock10?.content],
  ["yesSpeech idéntico Portabilidad", lnBranch?.yesSpeech === portBranch?.yesSpeech],
  ["noSpeech idéntico Portabilidad", lnBranch?.noSpeech === portBranch?.noSpeech],
  ["consultaSpeech idéntico Portabilidad", lnBranch?.consultaSpeech === portBranch?.consultaSpeech],
  ["advisorNoteOnYes idéntico Portabilidad", lnBranch?.advisorNoteOnYes === portBranch?.advisorNoteOnYes],
  [
    "advisorNoteOnBlockStart ≠ Portabilidad",
    lnBranch?.advisorNoteOnBlockStart !== portBranch?.advisorNoteOnBlockStart,
  ],
  [
    "advisorNoteOnBlockStart = constante raw [26]",
    lnBranch?.advisorNoteOnBlockStart === LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE,
  ],
  [
    "LN usa buildBlock10Prefijo809Speech (content)",
    lnStep.content === buildBlock10Prefijo809Speech({ clientFirstName: "María" }).content,
  ],
);

let missingName = false;
try {
  assertLineaNuevaBloque11Ready(
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
    error instanceof LineaNuevaBloque11ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", missingName]);

console.log("\n--- BLOQUE 11 · LÍNEA NUEVA · PREFIJO 809 ---\n");
console.log("content:", lnStep.content, "\n");
console.log("advisorNoteOnBlockStart:", lnBranch?.advisorNoteOnBlockStart, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
