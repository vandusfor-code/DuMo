/** Verifica Bloque 8 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-08.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque08ChipPrepago,
  lineaNuevaBloque08ChipPrepago,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-08-chip-prepago";
import { LINEA_NUEVA_BLOQUE08_RAW21_HEADING } from "../src/lib/sales-script/linea-nueva/sections/bloque-08-chip-prepago.constants";
import {
  LineaNuevaBloque08ValidationError,
  assertLineaNuevaBloque08Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-08-chip-prepago.validation";
import { buildBlock7GiftSpeech } from "../src/lib/sales-script/teleprompter/block7-gift-speech";
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
    conversationId: `conv-ln-b08-${input.planId}-${lineCount}`,
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

  const step = buildLineaNuevaBloque08ChipPrepago(ctx);
  const firstName = (gestion.customerName ?? "").trim().split(/\s+/)[0] ?? "";
  const portSpeech = buildBlock7GiftSpeech({ clientFirstName: firstName });

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico Portabilidad`, step.content === portSpeech],
    [`${label}: menciona primer nombre`, step.content.startsWith(`${firstName},`)],
    [`${label}: texto chip prepago`, step.content.includes("te regalamos un chip prepago")],
    [`${label}: sin encabezado raw`, !step.content.includes(LINEA_NUEVA_BLOQUE08_RAW21_HEADING)],
    [`${label}: sin encuesta NPS`, !step.content.includes("¿Qué te pareció mi atención?")],
    [`${label}: sin placeholders`, !step.content.includes("{{") && !step.content.includes("XXX")],
    [`${label}: sin ramas`, true],
  ];
}

const allChecks: [string, boolean][] = [];

for (const planId of ["plan-w", "plan-o", "plan-m"] as const) {
  allChecks.push(...runScenario(`Plan ${planId.toUpperCase()} · monolínea`, buildGestion({ planId })));
}

allChecks.push(
  ...runScenario("Multilínea · Plan O", buildGestion({ planId: "plan-o", lineCount: 2 })),
);
allChecks.push(
  ...runScenario("Retiro tienda · Plan O", buildGestion({ planId: "plan-o", deliveryType: "store" })),
);

const mono = buildLineaNuevaBloque08ChipPrepago(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
const multi = buildLineaNuevaBloque08ChipPrepago(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multi",
    gestion: buildGestion({ planId: "plan-o", lineCount: 3 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
allChecks.push(["Multilínea = monolínea (mismo cliente)", mono === multi]);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b08-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque08ChipPrepago.register({ ctx: lnCtx, flags: ruleFlags, builder });
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

const lnSpeech = buildLineaNuevaBloque08ChipPrepago(lnCtx).content;
const portBlock7 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-7");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id chip_prepago", registered.id === "chip_prepago"],
  ["builder: label Chip prepago", registered.label === "Chip prepago"],
  ["discurso idéntico Portabilidad bloque-7", lnSpeech === portBlock7?.content],
  ["LN usa buildBlock7GiftSpeech", lnSpeech === buildBlock7GiftSpeech({ clientFirstName: "María" })],
);

let missingName = false;
try {
  assertLineaNuevaBloque08Ready(
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
    error instanceof LineaNuevaBloque08ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", missingName]);

console.log("\n--- BLOQUE 8 · LÍNEA NUEVA · CHIP PREPAGO ---\n");
console.log(lnSpeech, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
