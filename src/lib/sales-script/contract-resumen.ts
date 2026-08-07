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

export type ContractResumenMode = "portability" | "new_line";

const PORTABILITY_DISCLAIMER =
  "Recuerda que si por algún motivo el número no se porta, los beneficios explicados quedarán sin efecto, por eso es importante que cumplas con las condiciones de portabilidad que te explicaré en breve.";

const UPSELLING_CLOSING: Record<ContractResumenMode, string> = {
  portability:
    "Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás los beneficios obtenidos con este nuevo plan.",
  new_line:
    "Recuerda que si tenías algún beneficio anterior quedará inválido, pero ganarás todos los beneficios de tu nuevo Plan Simple.",
};

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

function portabilityIntro(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  return `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM`;
}

function lineaNuevaIntro(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  return `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} una línea nueva con un número nuevo (o portabilidad), que tomarás con WOM`;
}

function contractIntro(ctx: ScriptBuildContext, mode: ContractResumenMode): string {
  return mode === "new_line" ? lineaNuevaIntro(ctx) : portabilityIntro(ctx);
}

function appendDisclaimer(parts: string[], mode: ContractResumenMode): string[] {
  if (mode === "portability") {
    return [...parts, PORTABILITY_DISCLAIMER];
  }
  return parts;
}

function mainLineValueLabel(mode: ContractResumenMode): "valor transparente" | "valor mensual" {
  return mode === "new_line" ? "valor mensual" : "valor transparente";
}

/** Parte A — validación de datos (script oficial, línea 9). */
export function buildContractDataValidationIntro(ctx: ScriptBuildContext): string {
  const v = ctx.vars;
  const parts: string[] = [
    `Tu nombre completo es ${speechValue(v.nombre_cliente, "el titular del servicio")}`,
  ];

  if (v.rut?.trim()) parts.push(`RUT ${v.rut}`);

  const domicilio = optionalClause("con domicilio en {value}", v.direccion_completa);
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
  mode: ContractResumenMode,
): string {
  const main = lineDetails[0];
  const additionalPrice = getAdditionalLineUnitPrice(ctx.planDetail);
  const additional = lineDetails.length - 1;
  const addLabel = formatCurrency(additionalPrice);
  const valueLabel = mainLineValueLabel(mode);
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  const intro = `${contractIntro(ctx, mode)} con el plan ${main.planName}.`;

  let multilineDetail: string;
  if (additional === 1) {
    multilineDetail = `La línea principal queda con su ${valueLabel} de ${main.planValueLabel} y la línea adicional queda con un monto a pagar de ${addLabel} al mes de forma transparente`;
  } else {
    const adj = additional === 2 ? "dos" : additional === 3 ? "tres" : String(additional);
    multilineDetail = `La línea principal queda con su ${valueLabel} de ${main.planValueLabel} y las ${adj} líneas adicionales quedan con un monto a pagar de ${addLabel} al mes de forma transparente cada una`;
  }

  if (mode === "portability") {
    const total = formatCurrency(ctx.totalMonthly);
    multilineDetail = `${multilineDetail}, para un total mensual de ${total}`;
  }

  const body = promo ? `${multilineDetail}${promo}` : multilineDetail;

  return appendDisclaimer([intro, body], mode).join("\n\n");
}

function buildHeterogeneousMultilineBody(
  ctx: ScriptBuildContext,
  lineDetails: LineSpeechDetail[],
  promoSuffix: string,
  mode: ContractResumenMode,
): string {
  const linePhrases = lineDetails.map((line) => {
    const role = line.isMain ? "tu línea principal" : `tu línea adicional ${line.index}`;
    return `${role} al plan ${line.planName} por un valor mensual de ${line.planValueLabel}`;
  });

  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return appendDisclaimer(
    [
      `${contractIntro(ctx, mode)}: ${joinNaturalList(linePhrases)}, para un total mensual de ${formatCurrency(ctx.totalMonthly)}${promo}`,
    ],
    mode,
  ).join("\n\n");
}

function buildSingleLineBody(
  ctx: ScriptBuildContext,
  promoSuffix: string,
  mode: ContractResumenMode,
): string {
  const v = ctx.vars;
  const line = ctx.lineDetails[0];
  const planName = line?.planName ?? v.plan;
  const planValue = line?.planValueLabel ?? v.valor_plan;
  const promo = promoSuffix ? `${promoSuffix}.` : "";
  const amountLabel = mode === "new_line" ? "monto mensual" : "valor mensual";

  return appendDisclaimer(
    [
      `${contractIntro(ctx, mode)} con el plan ${planName}, por ${mode === "new_line" ? "el" : "un"} ${amountLabel} de ${planValue}${promo}`,
    ],
    mode,
  ).join("\n\n");
}

/** Upselling / homologación — reemplaza el discurso estándar (script oficial, línea 14 Portabilidad / [8] LN). */
function buildUpsellingBody(
  ctx: ScriptBuildContext,
  promoSuffix: string,
  mode: ContractResumenMode,
): string {
  const main = ctx.lineDetails[0];
  const phone = speechValue(ctx.vars.numero_portar, "el número a portar");
  const planName = main?.planName ?? ctx.vars.plan;
  const planValue = main?.planValueLabel ?? ctx.vars.valor_plan;
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return [
    `Aceptas modificar el plan actual para el número ${phone} al nuevo plan ${planName} con un monto a pagar de ${planValue}${promo}`,
    UPSELLING_CLOSING[mode],
  ].join("\n\n");
}

/** Parte B — resumen de contratación (tras validar datos). */
export function buildContractSummarySpeech(
  ctx: ScriptBuildContext,
  mode: ContractResumenMode = "portability",
): string {
  const promoSuffix = contractPromoSuffix(ctx);
  const lineDetails = ctx.lineDetails;

  if (isUpsellingLine(ctx.mainLine)) {
    return buildUpsellingBody(ctx, promoSuffix, mode);
  }

  if (lineDetails.length <= 1) {
    return buildSingleLineBody(ctx, promoSuffix, mode);
  }

  if (hasDistinctPlansPerLine(lineDetails)) {
    return buildHeterogeneousMultilineBody(ctx, lineDetails, promoSuffix, mode);
  }

  return buildHomogeneousMultilineBody(ctx, lineDetails, promoSuffix, mode);
}

/** @deprecated Usar buildContractDataValidationIntro + buildContractSummarySpeech */
export function buildContractCoreSpeech(ctx: ScriptBuildContext): string {
  return buildContractSummarySpeech(ctx);
}

/** Discurso completo legacy — preferir intro + summary por separado. */
export function buildContractResumenSpeech(ctx: ScriptBuildContext): string {
  return [buildContractDataValidationIntro(ctx), "", buildContractSummarySpeech(ctx)].join("\n");
}
