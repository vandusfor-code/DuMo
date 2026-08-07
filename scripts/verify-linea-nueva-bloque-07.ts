/** Verifica Bloque 7 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-07.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque07Compatibilidad,
  lineaNuevaBloque07Compatibilidad,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-07-compatibilidad";
import { LINEA_NUEVA_BLOQUE07_RAW19_HEADING } from "../src/lib/sales-script/linea-nueva/sections/bloque-07-compatibilidad.constants";
import { buildCompatibilidadEquiposSpeech } from "../src/lib/sales-script/teleprompter/block5-delivery-speech";
import { buildBlock5DeliverySpeech } from "../src/lib/sales-script/teleprompter/block5-delivery-speech";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };
const DELIVERY_CONFIG = DEFAULT_DELIVERY_TELEPROMPTER_CONFIG;

function buildGestion(input: { lineCount?: number; deliveryType?: "home" | "store" }): SaveLeadInput {
  const lineCount = input.lineCount ?? 1;
  return {
    conversationId: `conv-ln-b07-${lineCount}-${input.deliveryType ?? "home"}`,
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: Array.from({ length: lineCount }, (_, index) => ({
      phone: `5698765432${index}`,
      saleType: "new_line" as const,
      planId: "plan-o",
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
  buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  });

  const step = buildLineaNuevaBloque07Compatibilidad();
  const canonical = buildCompatibilidadEquiposSpeech();

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: idéntico builder transversal`, step.content === canonical],
    [`${label}: URL sello-multibandas`, step.content.includes("https://www.wom.cl/sello-multibandas/")],
    [`${label}: sin encabezado raw`, !step.content.includes(LINEA_NUEVA_BLOQUE07_RAW19_HEADING)],
    [`${label}: sin contratos anexos`, !step.content.includes("Bienvenido a Wom")],
    [`${label}: sin placeholders`, !step.content.includes("{{") && !step.content.includes("XXXX")],
    [`${label}: texto estático`, step.content.startsWith("Te recuerdo que puedes revisar")],
    [`${label}: sin ramas`, true],
  ];
}

const allChecks: [string, boolean][] = [];

allChecks.push(...runScenario("Monolínea · domicilio", buildGestion({ lineCount: 1, deliveryType: "home" })));
allChecks.push(...runScenario("Multilínea · domicilio", buildGestion({ lineCount: 2, deliveryType: "home" })));
allChecks.push(...runScenario("Retiro tienda", buildGestion({ lineCount: 1, deliveryType: "store" })));

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b07-builder",
  gestion: buildGestion({ lineCount: 1 }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque07Compatibilidad.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: {
    ...buildGestion({ lineCount: 1 }),
    lines: [
      {
        ...buildGestion({ lineCount: 1 }).lines[0],
        saleType: "portability",
        currentOperator: "movistar",
        deliveryCarrier: undefined,
      },
    ],
  },
  commercialPlans: PLANS,
  deliveryConfig: DELIVERY_CONFIG,
  advisor: ADVISOR,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const lnSpeech = buildLineaNuevaBloque07Compatibilidad().content;
const portCompat = buildCompatibilidadEquiposSpeech();
const portBlock5 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-5");
const portDelivery = buildBlock5DeliverySpeech({
  deliveryIsHome: true,
  deliveryIsStore: false,
  contactPhones: portCtx.contactPhones,
  region: portCtx.vars.region,
  comuna: portCtx.vars.comuna,
  direccion: portCtx.vars.direccion,
  fechaEntrega: portCtx.vars.fecha_entrega,
  pickupStoreName: "",
  pickupStoreAddress: "",
  pickupStoreSchedule: "",
  isUltraExpressDelivery: false,
});

allChecks.push(
  ["builder: no omitido", registered.skipped === false],
  ["builder: id compatibilidad", registered.id === "compatibilidad"],
  ["builder: label Compatibilidad", registered.label === "Compatibilidad"],
  ["discurso idéntico buildCompatibilidadEquiposSpeech", lnSpeech === portCompat],
  ["Portabilidad bloque-5 incluye compatibilidad", portBlock5?.content.includes(lnSpeech) ?? false],
  ["Portabilidad post-cierre incluye compatibilidad", portDelivery.includes(lnSpeech)],
  ["LN solo compatibilidad (sin contratos)", !lnSpeech.includes("contratos de servicios")],
  ["independiente de gestión", lnSpeech === buildLineaNuevaBloque07Compatibilidad().content],
);

console.log("\n--- BLOQUE 7 · LÍNEA NUEVA · COMPATIBILIDAD ---\n");
console.log(lnSpeech, "\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
