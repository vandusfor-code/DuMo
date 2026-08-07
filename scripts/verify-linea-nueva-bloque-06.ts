/** Verifica Bloque 6 Línea Nueva — npx tsx scripts/verify-linea-nueva-bloque-06.ts */
import { COMMERCIAL_PLANS_MOCK } from "../src/data/mock/commercial-config.mock";
import { buildScriptContext } from "../src/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "../src/lib/sales-script/linea-nueva/linea-nueva-context";
import { LineaNuevaScriptBuilder } from "../src/lib/sales-script/linea-nueva/linea-nueva-builder";
import { lineaNuevaRuleEngine } from "../src/lib/sales-script/linea-nueva/linea-nueva-rules";
import {
  buildLineaNuevaIdCardCarrierReceiverSpeech,
  buildLineaNuevaNomadOtpSpeech,
} from "../src/lib/sales-script/linea-nueva/delivery/linea-nueva-delivery-speech";
import {
  buildLineaNuevaBloque06Despacho,
  lineaNuevaBloque06Despacho,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-06-despacho";
import {
  LineaNuevaBloque06ValidationError,
  assertLineaNuevaBloque06Ready,
} from "../src/lib/sales-script/linea-nueva/sections/bloque-06-despacho.validation";
import { buildBlock5DeliverySpeech } from "../src/lib/sales-script/teleprompter/block5-delivery-speech";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "../src/data/defaults/delivery-stores.default";
import type { SaveLeadInput } from "../src/types/lead";

const PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const ADVISOR = { id: "adv-1", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };
const DELIVERY_CONFIG = DEFAULT_DELIVERY_TELEPROMPTER_CONFIG;

type Carrier = "ALAS" | "SROUTE" | "CHILEPARCEL" | "NOMAD";

function buildGestion(input: {
  deliveryType: "home" | "store";
  carrier?: Carrier;
  lineCount?: number;
  omitCarrier?: boolean;
  omitAddress?: boolean;
}): SaveLeadInput {
  const lineCount = input.lineCount ?? 1;
  const lines = Array.from({ length: lineCount }, (_, index) => ({
    phone: `5698765432${index}`,
    saleType: "new_line" as const,
    planId: "plan-o",
    equipment: "none",
    equipmentMode: "without" as const,
    deliveryType: input.deliveryType,
    email: "maria@test.cl",
    deliveryAddress: input.omitAddress ? "" : "Av. Providencia 123",
    region: input.omitAddress ? "" : "metropolitana",
    comuna: input.omitAddress ? "" : "Providencia",
    accountType: "postpaid" as const,
    deliveryCarrier: input.omitCarrier ? "" : (input.carrier ?? "ALAS"),
    pickupStoreId: input.deliveryType === "store" ? "wom-costanera" : "",
  }));

  return {
    conversationId: `conv-ln-b06-${input.deliveryType}-${input.carrier ?? "store"}`,
    phone: "56912345678",
    customerName: "María González",
    rut: "12.345.678-9",
    type: "venta",
    notes: "",
    lines,
  };
}

function runHomeScenario(label: string, carrier: Carrier): [string, boolean][] {
  const gestion = buildGestion({ deliveryType: "home", carrier });
  const ctx = buildLineaNuevaScriptContext({
    gestionId: `gest-${label}`,
    gestion,
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  });
  const step = buildLineaNuevaBloque06Despacho(ctx);

  return [
    [`${label}: genera bloque`, step.content.trim().length > 0],
    [`${label}: despacho domicilio`, step.content.includes("Tu producto será despachado a la dirección")],
    [`${label}: correo Tu Compra va en Camino`, step.content.includes("Tu Compra va en Camino")],
    [`${label}: teléfono contacto`, step.content.includes("569-9123-45678")],
    [`${label}: fecha entrega`, step.content.includes("registrando la entrega")],
    [`${label}: sin firma portabilidad`, !step.content.includes("firmar la solicitud de la portabilidad")],
    [`${label}: sin Ultra Express`, !step.content.includes("Ultra Express")],
    [`${label}: sin condiciones generales`, !step.content.includes("mail de bienvenida")],
    [`${label}: nota asesora domicilio`, Boolean(step.branch?.despacho?.advisorNoteOnBlockStart)],
    [
      `${label}: rama carrier`,
      carrier === "NOMAD"
        ? step.content.includes("OTP vía WHATSAPP")
        : step.content.includes("cédula de identidad"),
    ],
  ];
}

const allChecks: [string, boolean][] = [];

for (const carrier of ["ALAS", "SROUTE", "CHILEPARCEL", "NOMAD"] as const) {
  allChecks.push(...runHomeScenario(`Domicilio · ${carrier}`, carrier));
}

const storeCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-store",
  gestion: buildGestion({ deliveryType: "store" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const storeStep = buildLineaNuevaBloque06Despacho(storeCtx);
allChecks.push(
  ["Retiro tienda: genera bloque", storeStep.content.trim().length > 0],
  ["Retiro tienda: sucursal", storeStep.content.includes("WOM Store Costanera Center")],
  ["Retiro tienda: correo Listo para tu retiro", storeStep.content.includes("Listo para tu retiro")],
  ["Retiro tienda: código por correo", storeStep.content.includes("correo recibido con el código de verificación de 6 dígitos")],
  ["Retiro tienda: sin SMS a portar", !storeStep.content.includes("SMS a tu número a portar")],
  ["Retiro tienda: plazo 7 días", storeStep.content.includes("7 días continuos")],
  ["Retiro tienda: nota fecha entrega", Boolean(storeStep.branch?.despacho?.advisorNoteOnBlockStart)],
);

const multiHome = buildLineaNuevaBloque06Despacho(
  buildLineaNuevaScriptContext({
    gestionId: "gest-multi",
    gestion: buildGestion({ deliveryType: "home", carrier: "ALAS", lineCount: 2 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
const monoHome = buildLineaNuevaBloque06Despacho(
  buildLineaNuevaScriptContext({
    gestionId: "gest-mono",
    gestion: buildGestion({ deliveryType: "home", carrier: "ALAS", lineCount: 1 }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
);
allChecks.push(["Multilínea = monolínea (mismo carrier)", multiHome.content === monoHome.content]);

const alasSpeech = buildLineaNuevaBloque06Despacho(
  buildLineaNuevaScriptContext({
    gestionId: "gest-alas",
    gestion: buildGestion({ deliveryType: "home", carrier: "ALAS" }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
const srouteSpeech = buildLineaNuevaBloque06Despacho(
  buildLineaNuevaScriptContext({
    gestionId: "gest-sroute",
    gestion: buildGestion({ deliveryType: "home", carrier: "SROUTE" }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
allChecks.push(["ALAS y SROUTE mismo discurso carrier", alasSpeech === srouteSpeech]);

const nomadSpeech = buildLineaNuevaBloque06Despacho(
  buildLineaNuevaScriptContext({
    gestionId: "gest-nomad",
    gestion: buildGestion({ deliveryType: "home", carrier: "NOMAD" }),
    commercialPlans: PLANS,
    advisor: ADVISOR,
    deliveryConfig: DELIVERY_CONFIG,
  }),
).content;
allChecks.push(
  ["NOMAD incluye OTP WhatsApp", nomadSpeech.includes(buildLineaNuevaNomadOtpSpeech().slice(0, 40))],
  ["NOMAD sin cédula como única vía", !nomadSpeech.endsWith("cédula de identidad.")],
);

const lnCtx = buildLineaNuevaScriptContext({
  gestionId: "gest-ln-b06-builder",
  gestion: buildGestion({ deliveryType: "home", carrier: "NOMAD" }),
  commercialPlans: PLANS,
  advisor: ADVISOR,
  deliveryConfig: DELIVERY_CONFIG,
});
const ruleFlags = lineaNuevaRuleEngine.evaluate(lnCtx).flags;
const builder = new LineaNuevaScriptBuilder(lnCtx, ruleFlags);
lineaNuevaBloque06Despacho.register({ ctx: lnCtx, flags: ruleFlags, builder });
const [registered] = builder.finish();

const portCtx = buildScriptContext({
  gestion: {
    ...buildGestion({ deliveryType: "home", carrier: "ALAS" }),
    lines: [
      {
        ...buildGestion({ deliveryType: "home", carrier: "ALAS" }).lines[0],
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

const lnSpeech = buildLineaNuevaBloque06Despacho(lnCtx).content;
const portDeliveryOnly = buildBlock5DeliverySpeech({
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
  ["builder: id despacho", registered.id === "despacho"],
  ["builder: label Despacho", registered.label === "Despacho"],
  ["LN difiere de Portabilidad domicilio", lnSpeech !== portDeliveryOnly],
  ["Portabilidad incluye firma portabilidad", portDeliveryOnly.includes("firmar la solicitud de la portabilidad")],
  ["LN NOMAD sin firma portabilidad", !lnSpeech.includes("firmar la solicitud de la portabilidad")],
);

let missingCarrier = false;
try {
  assertLineaNuevaBloque06Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid-carrier",
      gestion: buildGestion({ deliveryType: "home", omitCarrier: true }),
      commercialPlans: PLANS,
      advisor: ADVISOR,
      deliveryConfig: DELIVERY_CONFIG,
    }),
  );
} catch (error) {
  missingCarrier =
    error instanceof LineaNuevaBloque06ValidationError && error.code === "MISSING_CARRIER";
}
allChecks.push(["validación falla sin carrier", missingCarrier]);

let missingStore = false;
try {
  assertLineaNuevaBloque06Ready(
    buildLineaNuevaScriptContext({
      gestionId: "invalid-store",
      gestion: buildGestion({ deliveryType: "store" }),
      commercialPlans: PLANS,
      advisor: ADVISOR,
    }),
  );
} catch (error) {
  missingStore =
    error instanceof LineaNuevaBloque06ValidationError && error.code === "MISSING_PICKUP_STORE";
}
allChecks.push(["validación falla sin config tienda", missingStore]);

console.log("\n--- BLOQUE 6 · LÍNEA NUEVA · DESPACHO ---\n");
console.log("NOMAD:\n", nomadSpeech.slice(0, 500), "...\n");
console.log("Tienda:\n", storeStep.content.slice(0, 500), "...\n");

let failed = false;
for (const [label, ok] of allChecks) {
  console.log(`${ok ? "✅" : "❌"} ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exitCode = 1;
else console.log("\nEstado: CONGELADO v1.0\n");
