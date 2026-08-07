/** Verifica Bloque 10 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-10.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque10Vdi,
  lineaNuevaBloque10Vdi,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-10-vdi";
import {
  LINEA_NUEVA_BLOQUE10_RAW23_BRANCH_INSTRUCTION,
  LINEA_NUEVA_BLOQUE10_RAW23_HEADING,
  LINEA_NUEVA_BLOQUE10_RAW25_CLIENT_RESPONSE_INSTRUCTION,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-10-vdi.constants";
import {
  LineaNuevaBloque10ValidationError,
  assertLineaNuevaBloque10Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-10-vdi.validation";
import { buildBlock9AcceptanceSpeech } from "../src/lib/sales-script/teleprompter/block9-acceptance-speech";
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
    conversationId: `conv-ln-b10-${input.planId}-${lineCount}`,
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

  const step = buildLineaNuevaBloque10Vdi(ctx);
  const firstName = (gestion.customerName ?? "").trim().split(/\s+/)[0] ?? "";
  const portSpeech = buildBlock9AcceptanceSpeech({ clientFirstName: firstName });
  const vdiQuestion = step.branch?.acceptance?.postCondicionesSpeech ?? "";

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico Portabilidad (pregunta dudas)`, step.content === portSpeech.content],
    [`${label}: rama condicionesDudas`, Boolean(step.branch?.condicionesDudas?.advisorNoteOnYes)],
    [`${label}: rama acceptance VDI`, Boolean(step.branch?.acceptance?.postCondicionesSpeech)],
    [
      `${label}: VDI idéntico Portabilidad`,
      vdiQuestion === portSpeech.branch?.acceptance?.postCondicionesSpeech,
    ],
    [
      `${label}: nota VDI no idéntica Portabilidad`,
      step.branch?.acceptance?.advisorNoteOnNo === portSpeech.branch?.acceptance?.advisorNoteOnNo,
    ],
    [`${label}: menciona primer nombre`, step.content.startsWith(`${firstName},`)],
    [
      `${label}: pregunta dudas condiciones`,
      step.content.includes("¿te queda alguna duda con las condiciones entregadas?"),
    ],
    [
      `${label}: pregunta VDI`,
      vdiQuestion.includes("Validación de identidad aceptas las condiciones de este contrato"),
    ],
    [`${label}: sin encabezado raw en content`, !step.content.includes(LINEA_NUEVA_BLOQUE10_RAW23_HEADING)],
    [
      `${label}: sin instrucción ramas en content`,
      !step.content.includes(LINEA_NUEVA_BLOQUE10_RAW23_BRANCH_INSTRUCTION),
    ],
    [
      `${label}: sin instrucción respuesta en content`,
      !step.content.includes("RESPUESTA CLIENTE"),
    ],
    [`${label}: sin aclarar inventado`, !step.branch?.condicionesDudas?.yesSpeech],
    [`${label}: sin placeholder`, !step.content.includes("XX") && !step.content.includes("{{")],
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

const mono = buildLineaNuevaBloque10Vdi(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
const multi = buildLineaNuevaBloque10Vdi(
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
    "Multilínea VDI = monolínea",
    mono.branch?.acceptance?.postCondicionesSpeech ===
      multi.branch?.acceptance?.postCondicionesSpeech,
  ],
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b10-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque10Vdi.register({ ctx: lnCtx, flags: ruleFlags, builder });
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

const lnStep = buildLineaNuevaBloque10Vdi(lnCtx);
const portBlock9 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-9");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id vdi", registered.id === "vdi"],
  ["builder: label VDI", registered.label === "VDI"],
  ["builder: rama condicionesDudas", Boolean(registered.branch?.condicionesDudas?.advisorNoteOnYes)],
  ["builder: rama acceptance", Boolean(registered.branch?.acceptance?.postCondicionesSpeech)],
  ["discurso idéntico Portabilidad bloque-9 (content)", lnStep.content === portBlock9?.content],
  [
    "discurso idéntico Portabilidad bloque-9 (VDI)",
    lnStep.branch?.acceptance?.postCondicionesSpeech ===
      portBlock9?.branch?.acceptance?.postCondicionesSpeech,
  ],
  [
    "nota dudas idéntica Portabilidad",
    lnStep.branch?.condicionesDudas?.advisorNoteOnYes ===
      portBlock9?.branch?.condicionesDudas?.advisorNoteOnYes,
  ],
  [
    "nota VDI no idéntica Portabilidad",
    lnStep.branch?.acceptance?.advisorNoteOnNo === portBlock9?.branch?.acceptance?.advisorNoteOnNo,
  ],
  [
    "LN usa buildBlock9AcceptanceSpeech",
    lnStep.content === buildBlock9AcceptanceSpeech({ clientFirstName: "María" }).content,
  ],
  [
    "constante raw25 documentada",
    LINEA_NUEVA_BLOQUE10_RAW25_CLIENT_RESPONSE_INSTRUCTION.includes("RESPUESTA CLIENTE"),
  ],
);

let missingName = false;
try {
  assertLineaNuevaBloque10Ready(
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
    error instanceof LineaNuevaBloque10ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", missingName]);

console.log("\n--- BLOQUE 10 · LÍNEA NUEVA · VDI ---\n");
console.log("Fase 1 (content):", lnStep.content, "\n");
console.log("Fase 2 (postCondicionesSpeech):", lnStep.branch?.acceptance?.postCondicionesSpeech, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
