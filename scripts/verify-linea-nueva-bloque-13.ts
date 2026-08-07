/** Verifica Bloque 13 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-13.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque13Despedida,
  lineaNuevaBloque13Despedida,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-13-despedida";
import { LINEA_NUEVA_BLOQUE13_RAW33_HEADING } from "../src/lib/sales-script/linea-nueva/sections/bloque-13-despedida.constants";
import {
  LineaNuevaBloque13ValidationError,
  assertLineaNuevaBloque13Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-13-despedida.validation";
import { buildBlock12FarewellSpeech } from "../src/lib/sales-script/teleprompter/block12-farewell-speech";
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
  deliveryType?: "home" | "store";
}): SaveLeadInput {
  const lineCount = input.lineCount ?? 1;
  return {
    conversationId: `conv-ln-b13-${input.planId}-${lineCount}`,
    phone: "56912345678",
    customerName: "María González",
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

  const step = buildLineaNuevaBloque13Despedida(ctx);
  const portStep = buildBlock12FarewellSpeech({
    executiveEmail: ADVISOR.email,
    executiveName: ADVISOR.name,
  });

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico Portabilidad`, step.content === portStep],
    [`${label}: correo ejecutivo`, step.content.includes(ADVISOR.email)],
    [`${label}: nombre ejecutivo`, step.content.includes(ADVISOR.name)],
    [`${label}: cierre oficial`, step.content.includes("Bienvenido a WOM, que tengas un excelente día!")],
    [`${label}: sin encabezado raw`, !step.content.includes(LINEA_NUEVA_BLOQUE13_RAW33_HEADING)],
    [`${label}: sin placeholder correo`, !step.content.includes("XXX@")],
    [`${label}: sin placeholder ejecutivo`, !step.content.includes("(Nombre y apellido ejecutivo)")],
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

const mono = buildLineaNuevaBloque13Despedida(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
const multi = buildLineaNuevaBloque13Despedida(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multi",
    gestion: buildGestion({ planId: "plan-o", lineCount: 3 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
allChecks.push(["Multilínea = monolínea", mono === multi]);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b13-builder",
  gestion: buildGestion({ planId: "plan-o" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque13Despedida.register({ ctx: lnCtx, flags: ruleFlags, builder });
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
  advisor: { id: "adv-1", name: "María González", email: "maria@wom.cl" },
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const lnStep = buildLineaNuevaBloque13Despedida(lnCtx);
const portBlock12 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-12");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id despedida", registered.id === "despedida"],
  ["builder: label Despedida", registered.label === "Despedida"],
  [
    "LN usa buildBlock12FarewellSpeech",
    lnStep.content ===
      buildBlock12FarewellSpeech({
        executiveEmail: ADVISOR.email,
        executiveName: ADVISOR.name,
      }),
  ],
);

let missingExecutiveEmail = false;
try {
  assertLineaNuevaBloque13Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid-email",
      gestion: buildGestion({ planId: "plan-o" }),
      commercialPlans: PLANS,
      advisor: { id: "adv-1", name: "Carolina Pérez", email: "" },
      deliveryConfig: DELIVERY_CONFIG,
    }),
  );
} catch (error) {
  missingExecutiveEmail =
    error instanceof LineaNuevaBloque13ValidationError && error.code === "MISSING_EXECUTIVE_EMAIL";
}
allChecks.push(["validación falla sin correo ejecutivo", missingExecutiveEmail]);

let missingExecutiveName = false;
try {
  assertLineaNuevaBloque13Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid-name",
      gestion: buildGestion({ planId: "plan-o" }),
      commercialPlans: PLANS,
      advisor: { id: "adv-1", name: "", email: "carolina.perez@ventas.wom.cl" },
      deliveryConfig: DELIVERY_CONFIG,
    }),
  );
} catch (error) {
  missingExecutiveName =
    error instanceof LineaNuevaBloque13ValidationError && error.code === "MISSING_EXECUTIVE_NAME";
}
allChecks.push(["validación falla sin nombre ejecutivo", missingExecutiveName]);

console.log("\n--- BLOQUE 13 · LÍNEA NUEVA · DESPEDIDA ---\n");
console.log(lnStep.content, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
