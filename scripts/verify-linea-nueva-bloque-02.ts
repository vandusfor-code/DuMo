/** Verifica Bloque 2 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-02.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque02Audio,
  lineaNuevaBloque02Audio,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-02-audio";
import { buildBlock2AudioSpeech } from "../src/lib/sales-script/teleprompter/block2-audio-speech";
import { buildTeleprompterBlocks } from "../src/lib/sales-script/teleprompter/blocks";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");

function lineaNuevaGestion(): SaveLeadInput {
  return {
    conversationId: "conv-ln-b02",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56987654321",
        saleType: "new_line",
        planId: "plan-o",
        equipment: "none",
        equipmentMode: "without",
        deliveryType: "home",
        email: "maria@test.cl",
        deliveryAddress: "Av. Providencia 123",
        region: "metropolitana",
        comuna: "Providencia",
        accountType: "postpaid",
      },
    ],
  };
}

function portabilidadGestion(): SaveLeadInput {
  return {
    conversationId: "conv-port-b02",
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56987654321",
        saleType: "portability",
        planId: "plan-o",
        equipment: "none",
        equipmentMode: "without",
        currentOperator: "movistar",
        deliveryType: "home",
        email: "maria@test.cl",
        deliveryAddress: "Av. Providencia 123",
        region: "metropolitana",
        comuna: "Providencia",
        accountType: "postpaid",
      },
    ],
  };
}

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b02",
  gestion: lineaNuevaGestion(),
  commercialPlans: PLANS,
});
const direct = buildLineaNuevaBloque02Audio();
const transversal = buildBlock2AudioSpeech();

const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque02Audio.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: portabilidadGestion(),
  commercialPlans: PLANS,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const portB2 = buildTeleprompterBlocks(portCtx).find((b) => b.id === "bloque-2");
if (!portB2) throw new Error("bloque-2 Portabilidad no encontrado");

const content = direct.content;
const externalAudio = direct.branch?.externalAudio;

const checks: [string, boolean][] = [
  ["B02 no omitido en builder", registered.skipped === false],
  ["section id = audio (interno LN)", registered.id === "audio"],
  ["sectionLabel = Audio", registered.label === "Audio"],
  ["contenido no vacío", content.trim().length > 0],
  ["discurso idéntico builder transversal", content === transversal.content],
  ["discurso idéntico Portabilidad bloque-2", content === portB2.content],
  ["rama externalAudio presente", Boolean(externalAudio)],
  ["postAudioQuestion oficial", externalAudio?.postAudioQuestion === "¿Tienes alguna duda con el audio que escuchaste?"],
  ["advisorNoteOnYes presente", Boolean(externalAudio?.advisorNoteOnYes?.includes("Resuelve sus inquietudes"))],
  ["branch idéntica Portabilidad", JSON.stringify(direct.branch) === JSON.stringify(portB2.branch)],
  ["branch idéntica builder transversal", JSON.stringify(direct.branch) === JSON.stringify(transversal.branch)],
  ["texto raw [2] — gran decisión", content.includes("Has tomado una gran decisión")],
  ["texto raw [2] — 30 segundos", content.includes("30 segundos")],
  ["texto raw [2] — no cortes", content.includes("no cortes")],
  ["sin placeholders", !content.includes("XXXX") && !content.includes("{{")],
];

console.log("\n--- BLOQUE 2 · LÍNEA NUEVA · AUDIO ---\n");
console.log("Discurso:\n", content);
console.log("\nPost-audio:", externalAudio?.postAudioQuestion);
console.log("\nNota asesora (Sí):", externalAudio?.advisorNoteOnYes);
console.log("\nComparación Portabilidad bloque-2:");
console.log(content === portB2.content ? "✅ Idéntico" : "❌ Diferente");
console.log("");

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
