import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { formatCurrency } from "@/lib/format";
import {
  isUpsellingLine,
  type LineSpeechDetail,
} from "@/lib/sales-script/teleprompter/speech-builders";
import {
  getAdditionalLineUnitPrice,
} from "@/lib/sales-script/teleprompter/contract-pricing";
import { joinNaturalList, optionalClause, speechValue } from "@/lib/sales-script/teleprompter/speech-utils";
import { buildContractPromotionSuffix } from "@/lib/commercial-plan-offer";

const PORTABILITY_DISCLAIMER =
  "Recuerda que si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto, por eso es importante que cumplas con las condiciones de portabilidad que te explicaré en breve.";

function contractPromoSuffix(ctx: ScriptBuildContext): string {
  return buildContractPromotionSuffix({
    saleType: ctx.saleType,
    lineDetails: ctx.lineDetails,
  });
}

function hasDistinctPlansPerLine(lineDetails: LineSpeechDetail[]): boolean {
  if (lineDetails.length <= 1) return false;
  const reference = lineDetails[0];
  return lineDetails.some(
    (line) => line.planName !== reference.planName || line.planValue !== reference.planValue,
  );
}

/** Parte A — validación de datos (script oficial, línea 9). */
export function buildContractDataValidationIntro(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  const parts: string[] = [
    `Tú Nombre Completo es ${speechValue(v.nombre_cliente, "el titular del servicio")}`,
  ];

  if (v.rut?.trim()) parts.push(`RUT ${v.rut}`);

  const domicilio = optionalClause("domiciliado en {value}", v.direccion_completa);
  if (domicilio) parts.push(domicilio);

  if (v.correo?.trim()) parts.push(`y correo electrónico ${v.correo}`);

  const contacto = speechValue(v.telefono, "");
  if (contacto) parts.push(`tú número de contacto es el ${contacto}`);

  return [
    "Continuamos con un breve resumen de tu contratación:",
    "",
    `${parts.join(", ")}.`,
    "",
    "¿Son correctos tus datos?",
  ].join("\n");
}

function buildHomogeneousMultilineBody(
  ctx: ScriptBuildContext,
  lineDetails: LineSpeechDetail[],
  promoSuffix: string,
): string {
  const v = ctx.vars;
  const main = lineDetails[0];
  const additionalPrice = getAdditionalLineUnitPrice(ctx.planDetail);
  const additional = lineDetails.length - 1;
  const addLabel = formatCurrency(additionalPrice);
  const total = formatCurrency(ctx.totalMonthly);

  const intro = [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM con el plan ${main.planName}.`,
  ];

  let multilineDetail: string;
  if (additional === 1) {
    multilineDetail = `La línea principal queda con su valor transparente de ${main.planValueLabel} y la línea adicional queda con un monto a pagar de ${addLabel} al mes de forma transparente, para un total mensual de ${total}`;
  } else {
    const adj = additional === 2 ? "dos" : additional === 3 ? "tres" : String(additional);
    multilineDetail = `La línea principal queda con su valor transparente de ${main.planValueLabel} y las ${adj} líneas adicionales quedan con un monto a pagar de ${addLabel} al mes de forma transparente cada una, para un total mensual de ${total}`;
  }

  const promo = promoSuffix ? `${promoSuffix}.` : "";
  return [...intro, `${multilineDetail}${promo}`, PORTABILITY_DISCLAIMER].join("\n\n");
}

function buildHeterogeneousMultilineBody(
  ctx: ScriptBuildContext,
  lineDetails: LineSpeechDetail[],
  promoSuffix: string,
): string {
  const v = ctx.vars;
  const linePhrases = lineDetails.map((line) => {
    const role = line.isMain ? "tu línea principal" : `tu línea adicional ${line.index}`;
    return `${role} al plan ${line.planName} por el monto mensual de ${line.planValueLabel}`;
  });

  return [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM: ${joinNaturalList(linePhrases)}, para un total mensual de ${formatCurrency(ctx.totalMonthly)}${promoSuffix}.`,
    PORTABILITY_DISCLAIMER,
  ].join("\n\n");
}

function buildSingleLineBody(ctx: ScriptBuildContext, promoSuffix: string): string {
  const v = ctx.vars;
  const line = ctx.lineDetails[0];
  const planName = line?.planName ?? v.plan;
  const planValue = line?.planValueLabel ?? v.valor_plan;
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM con el plan ${planName}, por el monto mensual de ${planValue}${promo}`,
    PORTABILITY_DISCLAIMER,
  ].join("\n\n");
}

/** Upselling / homologación — reemplaza el discurso estándar (script oficial, línea 14). */
function buildUpsellingBody(ctx: ScriptBuildContext, promoSuffix: string): string {
  const main = ctx.lineDetails[0];
  const phone = speechValue(ctx.vars.numero_portar, "el número a portar");
  const planName = main?.planName ?? ctx.vars.plan;
  const planValue = main?.planValueLabel ?? ctx.vars.valor_plan;
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return [
    `Aceptas modificar el plan actual para el número ${phone} al nuevo plan ${planName} con un monto a pagar de ${planValue}${promo}`,
    "Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás los beneficios obtenidos con este nuevo plan.",
  ].join("\n\n");
}

/** Parte B — resumen de contratación (tras validar datos). */
export function buildContractSummarySpeech(ctx: ScriptBuildContext): string {
  const promoSuffix = contractPromoSuffix(ctx);
  const lineDetails = ctx.lineDetails;

  if (isUpsellingLine(ctx.mainLine)) {
    return buildUpsellingBody(ctx, promoSuffix);
  }

  if (lineDetails.length <= 1) {
    return buildSingleLineBody(ctx, promoSuffix);
  }

  if (hasDistinctPlansPerLine(lineDetails)) {
    return buildHeterogeneousMultilineBody(ctx, lineDetails, promoSuffix);
  }

  return buildHomogeneousMultilineBody(ctx, lineDetails, promoSuffix);
}

/** @deprecated Usar buildContractDataValidationIntro + buildContractSummarySpeech */
export function buildContractCoreSpeech(ctx: ScriptBuildContext): string {
  return buildContractSummarySpeech(ctx);
}

/** Discurso completo legacy — preferir intro + summary por separado. */
export function buildContractResumenSpeech(ctx: ScriptBuildContext): string {
  return [buildContractDataValidationIntro(ctx), "", buildContractSummarySpeech(ctx)].join("\n");
}
