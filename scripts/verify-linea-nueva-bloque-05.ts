/** Verifica Bloque 5 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-05.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque05Condiciones,
  lineaNuevaBloque05Condiciones,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-05-condiciones";
import { LINEA_NUEVA_BLOQUE05_RAW13_OPENING } from "../src/lib/sales-script/linea-nueva/sections/bloque-05-condiciones.constants";
import { buildGeneralConditionsSpeech } from "../src/lib/sales-script/teleprompter/block5-delivery-speech";
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
  withPromotions?: boolean;
  deliveryType?: "home" | "store";
}): SaveLeadInput {
  const planId = input.withPromotions === false ? "plan-w" : input.planId;
  const lines = Array.from({ length: input.lineCount }, (_, index) => ({
    phone: `5698765432${index}`,
    saleType: "new_line" as const,
    planId,
    equipment: "none",
    equipmentMode: "without" as const,
    deliveryType: input.deliveryType ?? ("home" as const),
    email: "maria@test.cl",
    deliveryAddress: "Av. Providencia 123",
    region: "metropolitana",
    comuna: "Providencia",
    accountType: "postpaid" as const,
    ...(input.deliveryType === "store"
      ? {
          pickupStoreId: "store-1",
        }
      : {}),
  }));

  return {
    conversationId: `conv-ln-b05-${planId}-${input.lineCount}-${input.withPromotions ?? "default"}`,
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines,
  };
}

function runScenario(label: string, gestion: SaveLeadInput): [string, boolean][] {
  buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: PLANS,
    advisor: ADVISOR,
  });

  const step = buildLineaNuevaBloque05Condiciones();
  const canonical = buildGeneralConditionsSpeech();

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico builder transversal`, step.content === canonical],
    [`${label}: apertura raw [13]`, step.content.startsWith(LINEA_NUEVA_BLOQUE05_RAW13_OPENING)],
    [`${label}: menciona wom.cl`, step.content.includes("wom.cl")],
    [`${label}: seguimiento despacho App`, step.content.includes("seguimiento de tu despacho en tiempo real")],
    [`${label}: sin placeholders`, !step.content.includes("{{") && !step.content.includes("XXXX")],
    [`${label}: sin despacho domicilio`, !step.content.includes("Tu Compra va en Camino")],
    [`${label}: sin compatibilidad equipos`, !step.content.includes("sello-multibandas")],
    [`${label}: sin portabilidad`, !step.content.includes("portabilidad")],
    [`${label}: sin ramas`, true],
  ];
}

const allChecks: [string, boolean][] = [];

allChecks.push(...runScenario("Cliente normal · Plan O monolínea", buildGestion({ planId: "plan-o", lineCount: 1 })));
allChecks.push(...runScenario("Monolínea · Plan W", buildGestion({ planId: "plan-w", lineCount: 1 })));
allChecks.push(...runScenario("Multilínea · Plan O x2", buildGestion({ planId: "plan-o", lineCount: 2 })));
allChecks.push(...runScenario("Multilínea · Plan M x3", buildGestion({ planId: "plan-m", lineCount: 3 })));
allChecks.push(
  ...runScenario("Sin promociones · Plan W", buildGestion({ planId: "plan-w", lineCount: 1, withPromotions: false })),
);
allChecks.push(
  ...runScenario("Con promociones · Plan O", buildGestion({ planId: "plan-o", lineCount: 1, withPromotions: true })),
);
allChecks.push(
  ...runScenario("Retiro tienda · Plan O", buildGestion({ planId: "plan-o", lineCount: 1, deliveryType: "store" })),
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b05-builder",
  gestion: buildGestion({ planId: "plan-o", lineCount: 1 }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque05Condiciones.register({ ctx: lnCtx, flags: ruleFlags, builder });
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

const lnSpeech = buildLineaNuevaBloque05Condiciones().content;
const portGeneral = buildGeneralConditionsSpeech();
const portBlock5 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-5");
const portBlock5StartsWithGeneral = portBlock5?.content.startsWith(portGeneral) ?? false;

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id condiciones", registered.id === "condiciones"],
  ["builder: label Condiciones", registered.label === "Condiciones"],
  ["discurso idéntico buildGeneralConditionsSpeech", lnSpeech === portGeneral],
  ["Portabilidad bloque-5 incluye condiciones generales", portBlock5StartsWithGeneral],
  ["LN no incluye tramo despacho Portabilidad", !lnSpeech.includes("firmar la solicitud de la portabilidad")],
  ["texto estático sin variables de gestión", lnSpeech === buildGeneralConditionsSpeech()],
);

console.log("\n--- BLOQUE 5 · LÍNEA NUEVA · CONDICIONES GENERALES ---\n");
console.log(lnSpeech, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
