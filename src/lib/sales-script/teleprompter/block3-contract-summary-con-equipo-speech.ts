/**
 * Bloque 3 — Resumen de contratación (Portabilidad con Equipo) ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-con-equipo.raw.txt (líneas 9, 12, 13, 14).
 * No modificar copy salvo cambio del script oficial o hallazgo de auditoría.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildContractPromotionSuffix } from "@/lib/commercial-plan-offer";
import { formatCurrency } from "@/lib/format";
import { getAdditionalLineUnitPrice } from "@/lib/sales-script/teleprompter/contract-pricing";
import { buildBlock3EquipmentFinancingSpeech } from "@/lib/sales-script/teleprompter/block3-equipment-financing-speech";
import { PORTABILITY_DISCLAIMER_CON_EQUIPO } from "@/lib/sales-script/teleprompter/block3-portability-disclaimer-con-equipo";
import {
  isUpsellingLine,
  type LineSpeechDetail,
} from "@/lib/sales-script/teleprompter/speech-builders";
import { joinNaturalList, speechValue } from "@/lib/sales-script/teleprompter/speech-utils";

function hasDistinctPlansPerLine(lineDetails: LineSpeechDetail[]): boolean {
  if (lineDetails.length <= 1) return false;
  const reference = lineDetails[0];
  return lineDetails.some(
    (line) => line.planName !== reference.planName || line.planValue !== reference.planValue,
  );
}

function contractPromoSuffix(ctx: ScriptBuildContext): string {
  return buildContractPromotionSuffix({
    saleType: ctx.saleType,
    lineDetails: ctx.lineDetails,
  });
}

function buildSingleLineBody(ctx: ScriptBuildContext, promoSuffix: string): string {
  const v = ctx.vars;
  const line = ctx.lineDetails[0];
  const planName = line?.planName ?? v.plan;
  const planValue = line?.planValueLabel ?? v.valor_plan;
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM con el plan ${planName}, por el monto mensual de ${planValue}${promo}`,
    PORTABILITY_DISCLAIMER_CON_EQUIPO,
  ].join("\n\n");
}

function buildHomogeneousMultilineBody(ctx: ScriptBuildContext, promoSuffix: string): string {
  const v = ctx.vars;
  const main = ctx.lineDetails[0];
  const additionalPrice = getAdditionalLineUnitPrice(ctx.planDetail);
  const additionalCount = ctx.lineDetails.length - 1;
  const addLabel = formatCurrency(additionalPrice);
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  const core = [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM con el plan ${main.planName}, por el monto mensual de ${main.planValueLabel}${promo}`,
    PORTABILITY_DISCLAIMER_CON_EQUIPO,
  ].join("\n\n");

  const additionalLabel =
    additionalCount === 1
      ? "la línea adicional queda"
      : `las ${additionalCount} líneas adicionales quedan`;

  const multiline = `La línea principal queda con su valor transparente de ${main.planValueLabel} y ${additionalLabel} con un monto a pagar de ${addLabel} al mes.`;

  return [core, multiline].join("\n\n");
}

function buildHeterogeneousMultilineBody(ctx: ScriptBuildContext, promoSuffix: string): string {
  const v = ctx.vars;
  const linePhrases = ctx.lineDetails.map((line) => {
    const role = line.isMain ? "tu línea principal" : `tu línea adicional ${line.index}`;
    return `${role} al plan ${line.planName} por un monto mensual de ${line.planValueLabel}`;
  });
  const promo = promoSuffix ? `${promoSuffix}.` : "";

  return [
    `Según las condiciones acordadas, aceptas contratar hoy con fecha ${speechValue(v.fecha_contratacion, "hoy")} la portabilidad de tu número ${speechValue(v.numero_portar, "tu número a portar")} proveniente de la compañía ${speechValue(v.operador_actual, "tu operador actual")} a WOM: ${joinNaturalList(linePhrases)}${promo}`,
    PORTABILITY_DISCLAIMER_CON_EQUIPO,
  ].join("\n\n");
}

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

function buildContractBody(ctx: ScriptBuildContext): string {
  const promoSuffix = contractPromoSuffix(ctx);
  const lineDetails = ctx.lineDetails;

  if (isUpsellingLine(ctx.mainLine)) {
    return buildUpsellingBody(ctx, promoSuffix);
  }
  if (lineDetails.length <= 1) {
    return buildSingleLineBody(ctx, promoSuffix);
  }
  if (hasDistinctPlansPerLine(lineDetails)) {
    return buildHeterogeneousMultilineBody(ctx, promoSuffix);
  }
  return buildHomogeneousMultilineBody(ctx, promoSuffix);
}

/** Parte B — resumen de contratación + equipo (tras validar datos). */
export function buildBlock3ContractSummaryConEquipoSpeech(ctx: ScriptBuildContext): string {
  if (!ctx.mainEquipment) {
    throw new Error(
      "No hay datos de equipo en el contexto. Verifica la gestión antes de generar el Bloque 3 de Portabilidad con Equipo.",
    );
  }

  const contractBody = buildContractBody(ctx);
  const equipmentSpeech = buildBlock3EquipmentFinancingSpeech(ctx.mainEquipment);

  return [contractBody, equipmentSpeech].join("\n\n");
}
