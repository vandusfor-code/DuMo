/** Verifica Bloque 12 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-12.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque12Referido,
  lineaNuevaBloque12Referido,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-12-referido";
import {
  LINEA_NUEVA_BLOQUE12_RAW32_HEADING,
  LINEA_NUEVA_BLOQUE12_RAW32_PARENTETIC,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-12-referido.constants";
import {
  LineaNuevaBloque12ValidationError,
  assertLineaNuevaBloque12Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-12-referido.validation";
import { buildBlock11ReferralSpeech } from "../src/lib/sales-script/teleprompter/block11-referral-speech";
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
    conversationId: `conv-ln-b12-${input.planId}-${lineCount}`,
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

  const step = buildLineaNuevaBloque12Referido(ctx);
  const firstName = (gestion.customerName ?? "").trim().split(/\s+/)[0] ?? "";
  const portStep = buildBlock11ReferralSpeech({ clientFirstName: firstName });

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico Portabilidad (content)`, step.content === portStep.content],
    [`${label}: rama referral`, Boolean(step.branch?.referral?.advisorNote)],
    [
      `${label}: advisorNote idéntico Portabilidad`,
      step.branch?.referral?.advisorNote === portStep.branch?.referral?.advisorNote,
    ],
    [`${label}: menciona primer nombre`, step.content.startsWith(`${firstName},`)],
    [
      `${label}: discurso oficial`,
      step.content.includes("me gustaría saber si conoces a alguien que quiera acceder a todos los beneficios de WOM"),
    ],
    [`${label}: sin pregunta extra inventada`, !step.content.includes("¿Me podrías compartir")],
    [`${label}: sin encabezado raw`, !step.content.includes(LINEA_NUEVA_BLOQUE12_RAW32_HEADING)],
    [`${label}: sin parentético raw en content`, !step.content.includes(LINEA_NUEVA_BLOQUE12_RAW32_PARENTETIC)],
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

const mono = buildLineaNuevaBloque12Referido(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
const multi = buildLineaNuevaBloque12Referido(
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
    "Multilínea advisorNote = monolínea",
    mono.branch?.referral?.advisorNote === multi.branch?.referral?.advisorNote,
  ],
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b12-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque12Referido.register({ ctx: lnCtx, flags: ruleFlags, builder });
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

const lnStep = buildLineaNuevaBloque12Referido(lnCtx);
const portBlock11 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-11");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id referido", registered.id === "referido"],
  ["builder: label Referido", registered.label === "Referido"],
  ["builder: rama referral", Boolean(registered.branch?.referral?.advisorNote)],
  ["discurso idéntico Portabilidad bloque-11 (content)", lnStep.content === portBlock11?.content],
  [
    "advisorNote idéntico Portabilidad bloque-11",
    lnStep.branch?.referral?.advisorNote === portBlock11?.branch?.referral?.advisorNote,
  ],
  [
    "LN usa buildBlock11ReferralSpeech",
    lnStep.content === buildBlock11ReferralSpeech({ clientFirstName: "María" }).content,
  ],
  [
    "advisorNote = REFERRAL_ADVISOR_NOTE congelado",
    lnStep.branch?.referral?.advisorNote === "Solicita nombre y teléfono del referido.",
  ],
);

let missingName = false;
try {
  assertLineaNuevaBloque12Ready(
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
    error instanceof LineaNuevaBloque12ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", missingName]);

console.log("\n--- BLOQUE 12 · LÍNEA NUEVA · REFERIDO ---\n");
console.log("content:", lnStep.content, "\n");
console.log("advisorNote:", lnStep.branch?.referral?.advisorNote, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
