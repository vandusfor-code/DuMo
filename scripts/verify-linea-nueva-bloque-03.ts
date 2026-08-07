/** Verifica Bloque 3 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-03.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import {
  buildContractDataValidationIntro,
  buildContractSummarySpeech,
} from "../src/lib/sales-script/contract-resumen";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque03ResumenVenta,
  lineaNuevaBloque03ResumenVenta,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-03-resumen-venta";
import {
  LineaNuevaBloque03ValidationError,
  assertLineaNuevaBloque03Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-03-resumen-venta.validation";
import { buildScriptBuildContextFromLineaNueva } from "../src/lib/sales-script/linea-nueva/linea-nueva-teleprompter-adapter";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) =>
  ["plan-w", "plan-o", "plan-m"].includes(p.id),
);
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };

function buildGestion(input: {
  planId: string;
  lineCount: number;
  customerName?: string;
  email?: string;
  phone?: string;
  omitAdvisor?: boolean;
}): SaveLeadInput {
  const lines = Array.from({ length: input.lineCount }, (_, index) => ({
    phone: `5698765432${index}`,
    saleType: "new_line" as const,
    planId: input.planId,
    equipment: "none",
    equipmentMode: "without" as const,
    deliveryType: "home" as const,
    email: input.email ?? "maria@test.cl",
    deliveryAddress: "Av. Providencia 123",
    region: "metropolitana",
    comuna: "Providencia",
    accountType: "postpaid" as const,
  }));

  return {
    conversationId: `conv-ln-b03-${input.planId}-${input.lineCount}`,
    phone: input.phone ?? "56912345678",
    customerName: input.customerName ?? "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines,
  };
}

function runScenario(label: string, gestion: SaveLeadInput): [string, boolean][] {
  const ctx = buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: PLANS,
    advisor: ADVISOR,
  });

  const step = buildLineaNuevaBloque03ResumenVenta(ctx);
  const scriptCtx = buildScriptBuildContextFromLineaNueva(assertLineaNuevaBloque03Ready(ctx));
  const summary = step.branch?.dataValidation?.postValidationSpeech ?? "";
  const lineCount = gestion.lines.length;

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0 && summary.trim().length > 0],
    [`${label}: intro validación datos`, step.content.includes("¿Son correctos tus datos?")],
    [`${label}: variables cliente`, step.content.includes("María González")],
    [`${label}: variables correo`, step.content.includes("maria@test.cl")],
    [`${label}: variables teléfono`, step.content.includes("569-9123-45678")],
    [`${label}: texto línea nueva`, summary.includes("línea nueva con un número nuevo (o portabilidad)")],
    [`${label}: sin disclaimer portabilidad`, !summary.includes("si el número no se porta")],
    [`${label}: rama dataValidation`, Boolean(step.branch?.dataValidation?.postValidationSpeech)],
    [`${label}: advisorNoteOnNo`, Boolean(step.branch?.dataValidation?.advisorNoteOnNo)],
    [
      `${label}: plan resuelto`,
      summary.includes(
        PLANS.find((p) => p.id === gestion.lines[0]?.planId)?.name ?? "___",
      ),
    ],
    [
      `${label}: multilínea coherente`,
      lineCount === 1
        ? !summary.includes("línea adicional")
        : summary.includes("línea adicional") || summary.includes("líneas adicionales"),
    ],
    [`${label}: promociones resueltas`, scriptCtx.vars.promociones !== undefined],
  ];
}

const scenarios: Array<[string, SaveLeadInput]> = [
  ["Plan W · 1 línea", buildGestion({ planId: "plan-w", lineCount: 1 })],
  ["Plan O · 1 línea", buildGestion({ planId: "plan-o", lineCount: 1 })],
  ["Plan M · 1 línea", buildGestion({ planId: "plan-m", lineCount: 1 })],
  ["Plan O · 2 líneas", buildGestion({ planId: "plan-o", lineCount: 2 })],
  ["Plan O · 3 líneas", buildGestion({ planId: "plan-o", lineCount: 3 })],
  ["Plan M · 2 líneas", buildGestion({ planId: "plan-m", lineCount: 2 })],
];

const allChecks: [string, boolean][] = [];

for (const [label, gestion] of scenarios) {
  allChecks.push(...runScenario(label, gestion));
}

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b03-builder",
  gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque03ResumenVenta.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: {
    ...buildGestion({ planId: "plan-o", lineCount: 1 }),
    lines: [
      {
        ...buildGestion({ planId: "plan-o", lineCount: 1 }).lines[0],
        saleType: "portability",
        currentOperator: "movistar",
      },
    ],
  },
  commercialPlans: PLANS,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  advisor: ADVISOR,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const portIntro = buildContractDataValidationIntro(portCtx);
const lnIntro = buildLineaNuevaBloque03ResumenVenta(lnCtx).content;
const portSummary = buildContractSummarySpeech(portCtx, "portability");
const lnSummary = buildContractSummarySpeech(buildScriptBuildContextFromLineaNueva(lnCtx), "new_line");
const portBlock3 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-3");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id resumen_venta", registered.id === "resumen_venta"],
  ["builder: label Contratación", registered.label === "Contratación"],
  ["intro idéntica Portabilidad", lnIntro === portIntro],
  ["summary difiere Portabilidad", lnSummary !== portSummary],
  ["summary LN monto mensual", lnSummary.includes("por el monto mensual de")],
  ["summary Portabilidad disclaimer", portSummary.includes("no se porta")],
  ["Portabilidad bloque-3 intacto", portBlock3?.branch?.dataValidation?.postValidationSpeech === portSummary],
);

let validationOk = false;
try {
  assertLineaNuevaBloque03Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid",
      gestion: buildGestion({ planId: "plan-o", lineCount: 1, email: "", omitAdvisor: true }),
      commercialPlans: PLANS,
      advisor: { id: "", name: "", email: "" },
    }),
  );
} catch (error) {
  validationOk =
    error instanceof LineaNuevaBloque03ValidationError &&
    (error.code === "MISSING_CLIENT_EMAIL" || error.code === "MISSING_ADVISOR");
}
allChecks.push(["validación falla sin correo/ejecutivo", validationOk]);

console.log("\n--- BLOQUE 3 · LÍNEA NUEVA · CONTRATACIÓN ---\n");
console.log("Intro validación:\n", lnIntro.slice(0, 280), "...\n");
console.log("Resumen Plan O monolínea:\n", lnSummary, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
