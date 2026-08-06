import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { formatCurrency } from "@/lib/format";
import {
  isUpsellingLine,
  type LineSpeechDetail,
} from "@/lib/sales-script/teleprompter/speech-builders";
import { joinNaturalList, optionalClause, speechValue } from "@/lib/sales-script/teleprompter/speech-utils";

/** Sufijo inline para boletas $0 y promociones (doc línea 11). */
export function buildPromotionInlineSuffix(promotions: string[]): string {
  const active = promotions.map((p) => p.trim()).filter(Boolean);
  if (active.length === 0) return "";
  return `, con ${joinNaturalList(active)} aplicables en los meses correspondientes de tu facturación`;
}

function hasDistinctPlansPerLine(lineDetails: LineSpeechDetail[]): boolean {
  if (lineDetails.length <= 1) return false;
  const reference = lineDetails[0];
  return lineDetails.some(
    (line) => line.planName !== reference.planName || line.planValue !== reference.planValue,
  );
}

function buildDataValidationParagraph(v: Record<string, string>): string {
  const parts: string[] = [`Tu nombre completo es ${speechValue(v.nombre_cliente, "el titular del servicio")}`];

  if (v.rut?.trim()) parts.push(`RUT ${v.rut}`);

  const domicilio = optionalClause("domiciliado en {value}", v.direccion_completa);
  if (domicilio) parts.push(domicilio);

  if (v.correo?.trim()) parts.push(`correo electrónico ${v.correo}`);

  const contacto = speechValue(v.telefono, "");
  if (contacto) parts.push(`y tu número de contacto es ${contacto}`);

  return `${parts.join(", ")}.`;
}

function buildHomogeneousMultilineClause(
  lineDetails: LineSpeechDetail[],
  additionalLineValue: number,
  totalMonthly: number,
): string {
  const main = lineDetails[0];
  const add = formatCurrency(additionalLineValue);
  const total = formatCurrency(totalMonthly);
  const additional = lineDetails.length - 1;

  if (additional === 1) {
    return ` con el ${main.planName} por un valor mensual transparente de ${main.planValueLabel} en tu línea principal, más una línea adicional a ${add}, para un total mensual de ${total}`;
  }

  const adj = additional === 2 ? "dos" : String(additional);
  return ` con el ${main.planName} por un valor mensual transparente de ${main.planValueLabel} en tu línea principal, y ${adj} líneas adicionales a ${add} cada una, para un total mensual de ${total}`;
}

function buildHeterogeneousMultilineClause(
  lineDetails: LineSpeechDetail[],
  totalMonthly: number,
): string {
  const linePhrases = lineDetails.map((line) => {
    const role = line.isMain ? "tu línea principal" : `tu línea adicional ${line.index}`;
    return `${role} al ${line.planName} por ${line.planValueLabel}`;
  });
  return `: ${joinNaturalList(linePhrases)}, para un total mensual de ${formatCurrency(totalMonthly)}`;
}

function buildUpsellingClause(ctx: ScriptBuildContext, promoSuffix: string): string {
  const main = ctx.lineDetails[0];
  const phone = speechValue(ctx.vars.numero_portar, "el número a portar");
  const planName = main?.planName ?? ctx.vars.plan;
  const planValue = main?.planValueLabel ?? ctx.vars.valor_plan;

  return [
    `Según las condiciones acordadas, aceptas contratar hoy ${ctx.vars.fecha_contratacion} la portabilidad de tu número ${phone}, proveniente de ${speechValue(ctx.vars.operador_actual, "tu operador actual")}, a WOM.`,
    "",
    `Aceptas modificar el plan actual de ese número al ${planName} con un monto a pagar de ${planValue}${promoSuffix}.`,
    "",
    "Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás los beneficios obtenidos con este nuevo plan.",
  ].join("\n");
}

/**
 * Párrafo central de contratación — un solo discurso continuo, sin repetir el nombre del plan.
 */
export function buildContractCoreSpeech(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  const promotions = ctx.planDetail?.promotions ?? [];
  const promoSuffix = buildPromotionInlineSuffix(promotions);
  const lineDetails = ctx.lineDetails;

  if (isUpsellingLine(ctx.mainLine)) {
    return buildUpsellingClause(ctx, promoSuffix);
  }

  const operador = speechValue(v.operador_actual, "tu operador actual");
  const fecha = speechValue(v.fecha_contratacion, "hoy");
  const numero = speechValue(v.numero_portar, "tu número a portar");
  const base = `Según las condiciones acordadas, aceptas contratar hoy ${fecha} la portabilidad de tu número ${numero}, proveniente de ${operador}, a WOM`;

  if (lineDetails.length <= 1) {
    const planName = lineDetails[0]?.planName ?? v.plan;
    const planValue = lineDetails[0]?.planValueLabel ?? v.valor_plan;
    return `${base} con el ${planName} por un valor mensual transparente de ${planValue}${promoSuffix}.`;
  }

  if (hasDistinctPlansPerLine(lineDetails)) {
    return `${base}${buildHeterogeneousMultilineClause(lineDetails, ctx.totalMonthly)}${promoSuffix}.`;
  }

  const additionalLineValue = ctx.planDetail?.additionalLineValue ?? 7_990;
  return `${base}${buildHomogeneousMultilineClause(lineDetails, additionalLineValue, ctx.totalMonthly)}${promoSuffix}.`;
}

/** Discurso completo del bloque Contratación. */
export function buildContractResumenSpeech(ctx: ScriptBuildContext): string {
  const v = ctx.vars;

  return [
    "Continuemos con un breve resumen de tu contratación.",
    "",
    buildDataValidationParagraph(v),
    "",
    buildContractCoreSpeech(ctx),
    "",
    "Si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto. Por eso es importante cumplir con las condiciones de portabilidad que te explicaré en breve.",
    "",
    "¿Son correctos tus datos?",
  ].join("\n");
}
