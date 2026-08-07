/** Verifica Bloque 1 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-01.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaBloque01Introduccion,
  lineaNuevaBloque01Introduccion,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-01-introduccion";
import { LINEA_NUEVA_BLOQUE01_ADVISOR_NOTE } from "../src/lib/sales-script/linea-nueva/sections/bloque-01-introduccion.constants";
import { minimalScriptBuildContextForSaludo } from "../src/lib/sales-script/linea-nueva/linea-nueva-teleprompter-adapter";
import { buildBlock1SaludoSpeech } from "../src/lib/sales-script/teleprompter/block1-saludo-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };

function lineaNuevaGestion(): SaveLeadInput {
  return {
    conversationId: "conv-ln-b01",
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

function portabilidadGestionEquivalente(): SaveLeadInput {
  return {
    conversationId: "conv-port-b01",
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

const gestion = lineaNuevaGestion();
const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b01",
  gestion,
  commercialPlans: PLANS,
  advisor: ADVISOR,
});

const direct = buildLineaNuevaBloque01Introduccion(lnCtx);

const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque01Introduccion.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: portabilidadGestionEquivalente(),
  commercialPlans: PLANS,
  deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  advisor: ADVISOR,
});
if (!portCtx) throw new Error("contexto Portabilidad nulo");

const portSaludo = buildBlock1SaludoSpeech(portCtx);
const lnSaludoViaAdapter = buildBlock1SaludoSpeech(minimalScriptBuildContextForSaludo(lnCtx));

const content = direct.content;
const checks: [string, boolean][] = [
  ["B01 no omitido en builder", registered.skipped === false],
  ["section id = introduccion", registered.id === "introduccion"],
  ["sectionLabel = Inicio", registered.label === "Inicio"],
  ["contenido no vacío", content.trim().length > 0],
  ["incluye nombre ejecutivo", content.includes(ADVISOR.name)],
  ["incluye primer nombre cliente", content.includes("María")],
  ["incluye continuidad conversación", content.includes("Para dar continuidad a lo anteriormente conversado")],
  ["incluye pregunta identificación", content.includes("¿Tengo el gusto de hablar con María?")],
  ["discurso idéntico Portabilidad (transversal)", content === portSaludo],
  ["adapter idéntico a Portabilidad", lnSaludoViaAdapter === portSaludo],
  ["nota asesora raw [1]", direct.branch?.inicio?.advisorNoteOnBlockStart === LINEA_NUEVA_BLOQUE01_ADVISOR_NOTE],
  ["nota asesora en builder", registered.branch?.inicio?.advisorNoteOnBlockStart === LINEA_NUEVA_BLOQUE01_ADVISOR_NOTE],
  ["sin rama Sí/No", !direct.branch?.externalAudio && !direct.branch?.dataValidation],
  ["variables resueltas (sin XXXX)", !content.includes("XXXX") && !content.includes("{{")],
];

console.log("\n--- BLOQUE 1 · LÍNEA NUEVA · INICIO ---\n");
console.log("Discurso:\n", content);
console.log("\nNota asesora (raw [1]):", direct.branch?.inicio?.advisorNoteOnBlockStart);
console.log("\nComparación Portabilidad Sin Equipo (mismo cliente/asesora):");
console.log(portSaludo === content ? "✅ Idéntico" : "❌ Diferente");
console.log("");

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
