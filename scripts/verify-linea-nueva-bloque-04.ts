/** Verifica Bloque 4 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-04.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { EMPTY_PLAN_OFFER, PLAN_O_OFFER } from "../src/lib/commercial-plan-offer";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque04Beneficios,
  lineaNuevaBloque04Beneficios,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-04-beneficios";
import {
  LineaNuevaBloque04ValidationError,
  assertLineaNuevaBloque04Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-04-beneficios.validation";
import { buildScriptBuildContextFromLineaNueva } from "../src/lib/sales-script/linea-nueva/linea-nueva-teleprompter-adapter";
import { buildMultilineBenefitsSpeech } from "../src/lib/sales-script/teleprompter/speech-builders";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { CommercialPlan } from "../src/types/commercial-config";
import type { SaveLeadInput } from "../src/types/lead";

const BASE_PLANS = COMMERCIAL_PLANS_MOCK.filter((p) =>
  ["plan-w", "plan-o", "plan-m"].includes(p.id),
);

const CUSTOM_PLAN: CommercialPlan = {
  id: "plan-custom-ln",
  name: "Plan Custom LN",
  operator: "WOM",
  saleType: "portabilidad",
  womValue: 11_990,
  promotionalPrice: 9_990,
  commercialOrder: 99,
  additionalLineValue: 7_990,
  maxLines: 3,
  dumoValue: 8_500,
  advisorCommission: 11_000,
  offer: {
    ...PLAN_O_OFFER,
    dataAllowance: "400 GB",
    dataAllowanceSpeechLabel: "400 Gigas personalizadas",
    clubBenefits: ["Comercio Alpha", "Comercio Beta"],
    clubWomListPartners: true,
  },
  specialConditions: "",
  status: "active",
};

const EMPTY_BENEFITS_PLAN: CommercialPlan = {
  id: "plan-empty-ln",
  name: "Plan Vacío LN",
  operator: "WOM",
  saleType: "portabilidad",
  womValue: 9_990,
  promotionalPrice: 7_990,
  commercialOrder: 100,
  additionalLineValue: 0,
  maxLines: 1,
  dumoValue: 7_000,
  advisorCommission: 8_000,
  offer: { ...EMPTY_PLAN_OFFER },
  specialConditions: "",
  status: "active",
};

const PLANS = [...BASE_PLANS, CUSTOM_PLAN, EMPTY_BENEFITS_PLAN];
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };

function buildGestion(input: {
  planIds: string[];
  customerName?: string;
}): SaveLeadInput {
  return {
    conversationId: `conv-ln-b04-${input.planIds.join("-")}`,
    phone: "56912345678",
    customerName: input.customerName ?? "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: input.planIds.map((planId, index) => ({
      phone: `5698765432${index}`,
      saleType: "new_line" as const,
      planId,
      equipment: "none",
      equipmentMode: "without" as const,
      deliveryType: "home" as const,
      email: "maria@test.cl",
      deliveryAddress: "Av. Providencia 123",
      region: "metropolitana",
      comuna: "Providencia",
      accountType: "postpaid" as const,
    })),
  };
}

function planDataToken(plan: CommercialPlan | undefined): string {
  if (!plan) return "___";
  return plan.offer.dataAllowance.trim().split(" ")[0] ?? plan.offer.dataAllowance;
}

function runScenario(
  label: string,
  gestion: SaveLeadInput,
  plans: CommercialPlan[] = PLANS,
  options?: { expectClientName?: boolean },
): [string, boolean][] {
  const expectClientName = options?.expectClientName ?? true;
  const ctx = buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: plans,
    advisor: ADVISOR,
  });

  const step = buildLineaNuevaBloque04Beneficios(ctx);
  const scriptCtx = buildScriptBuildContextFromLineaNueva(assertLineaNuevaBloque04Ready(ctx));
  const mainPlanId = gestion.lines[0]?.planId ?? "";
  const mainPlan = plans.find((p) => p.id === mainPlanId);

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: menciona cliente`, expectClientName ? step.content.includes("María González") : true],
    [`${label}: menciona plan contratado`, step.content.includes("que acabas de contratar")],
    [`${label}: sin bullets`, !step.content.includes("•")],
    [`${label}: sin boletas $0`, !step.content.includes("boleta $0")],
    [`${label}: catálogo dataAllowance`, step.content.includes(planDataToken(mainPlan))],
    [`${label}: lineDetails resueltos`, scriptCtx.lineDetails.length === gestion.lines.length],
  ];
}

const allChecks: [string, boolean][] = [];

for (const planId of ["plan-w", "plan-o", "plan-m"] as const) {
  allChecks.push(...runScenario(`Plan ${planId.toUpperCase()} · 1 línea`, buildGestion({ planIds: [planId] })));
}

allChecks.push(...runScenario("Plan O · 2 líneas mismo plan", buildGestion({ planIds: ["plan-o", "plan-o"] })));
const multilineSame = buildLineaNuevaBloque04Beneficios(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multiline",
    gestion: buildGestion({ planIds: ["plan-o", "plan-o"] }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
  }),
);
allChecks.push([
  "Plan O · 2 líneas: cierre multilínea homogénea",
  multilineSame.content.includes(
    "Estos beneficios estarán disponibles para todas las líneas contratadas bajo ese mismo plan.",
  ),
]);

allChecks.push(
  ...runScenario("Plan custom · beneficios personalizados", buildGestion({ planIds: ["plan-custom-ln"] })),
);
const customSpeech = buildLineaNuevaBloque04Beneficios(
  buildLineaNuevaScriptContext({
    gestionId: "gest-custom",
    gestion: buildGestion({ planIds: ["plan-custom-ln"] }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
  }),
);
allChecks.push(
  ["Plan custom: texto personalizado catálogo", customSpeech.content.includes("400 GB")],
  ["Plan custom: partners catálogo", customSpeech.content.includes("Comercio Alpha")],
);

allChecks.push(
  ...runScenario("Planes W+O · beneficios múltiples", buildGestion({ planIds: ["plan-w", "plan-o"] }), PLANS, {
    expectClientName: false,
  }),
);
const heterogeneous = buildLineaNuevaBloque04Beneficios(
  buildLineaNuevaScriptContext({
    gestionId: "gest-hetero",
    gestion: buildGestion({ planIds: ["plan-w", "plan-o"] }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
  }),
);
allChecks.push(
  ["Planes W+O: incluye Plan W", heterogeneous.content.includes("Plan W")],
  ["Planes W+O: incluye Plan O", heterogeneous.content.includes("Plan O")],
  ["Planes W+O: rol línea principal", heterogeneous.content.includes("tu línea principal")],
  ["Planes W+O: dos bloques de beneficio", heterogeneous.content.split("que acabas de contratar").length >= 3],
);

let emptyBenefitsFailed = false;
try {
  buildLineaNuevaBloque04Beneficios(
    buildLineaNuevaScriptContext({
      gestionId: "gest-empty",
      gestion: buildGestion({ planIds: ["plan-empty-ln"] }),
      commercialPlans: PLANS,
      advisor: ADVISOR,
    }),
  );
} catch (error) {
  emptyBenefitsFailed =
    error instanceof Error && error.message.includes("no tiene beneficios configurados");
}
allChecks.push(["Plan vacío: falla sin beneficios", emptyBenefitsFailed]);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b04-builder",
  gestion: buildGestion({ planIds: ["plan-o"] }),
  commercialPlans: BASE_PLANS,
  advisor: ADVISOR,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque04Beneficios.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: {
    ...buildGestion({ planIds: ["plan-o"] }),
    lines: [{ ...buildGestion({ planIds: ["plan-o"] }).lines[0], saleType: "portability", currentOperator: "movistar" }],
  },
  commercialPlans: BASE_PLANS,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  advisor: ADVISOR,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const lnSpeech = buildLineaNuevaBloque04Beneficios(lnCtx).content;
const portSpeech = buildMultilineBenefitsSpeech(portCtx.vars.nombre_cliente, portCtx.lineDetails);
const portBlock4 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-4");

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id beneficios", registered.id === "beneficios"],
  ["builder: label Plan", registered.label === "Plan"],
  ["discurso idéntico Portabilidad", lnSpeech === portSpeech],
  ["Portabilidad bloque-4 intacto", portBlock4?.content === portSpeech],
);

let validationOk = false;
try {
  assertLineaNuevaBloque04Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid",
      gestion: buildGestion({ planIds: ["plan-o"], customerName: "" }),
      commercialPlans: BASE_PLANS,
      advisor: ADVISOR,
    }),
  );
} catch (error) {
  validationOk =
    error instanceof LineaNuevaBloque04ValidationError && error.code === "MISSING_CLIENT_NAME";
}
allChecks.push(["validación falla sin nombre cliente", validationOk]);

console.log("\n--- BLOQUE 4 · LÍNEA NUEVA · BENEFICIOS ---\n");
console.log("Plan O monolínea:\n", lnSpeech.slice(0, 420), "...\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
