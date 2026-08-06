/**
 * Bloque 4 — Beneficios del plan (Portabilidad con Equipo) ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-con-equipo.raw.txt (líneas 17–21).
 * Responde: ¿Qué incluye el plan?
 * No modificar copy salvo cambio del script oficial, Oferta Comercial o hallazgo de auditoría.
 */

import type { CommercialPlan, PlanOffer } from "@/types/commercial-config";
import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { joinNaturalList } from "@/lib/sales-script/teleprompter/speech-utils";

function buildFreeInstallmentsPhrase(offer: PlanOffer): string | null {
  const fi = offer.freeDeviceInstallments;
  if (!fi?.enabled || fi.installmentNumbers.length === 0) return null;

  const count = fi.installmentNumbers.length;
  if (count === 1) {
    return "bonificación de la última cuota gratis en la compra de tu equipo financiado";
  }
  return `bonificación de las últimas ${count} cuotas gratis en la compra de tu equipo financiado`;
}

function buildHandsetCouponPhrase(offer: PlanOffer): string | null {
  const coupon = offer.handsetCoupon;
  if (!coupon?.enabled) return null;

  return `cupón de ${coupon.percent}% de descuento en equipos/accesorios al cumplir ${coupon.periodMonths} meses de permanencia`;
}

function buildEquipmentBenefitsSuffix(offer: PlanOffer): string {
  const coupon = buildHandsetCouponPhrase(offer);
  const installments = buildFreeInstallmentsPhrase(offer);

  if (!coupon && !installments) return "";

  const parts: string[] = [];
  if (coupon) parts.push(coupon);
  if (installments) parts.push(installments);

  return `Incluye beneficio de ${joinNaturalList(parts)}.`;
}

function buildCoreBenefitSegments(offer: PlanOffer): string[] {
  const segments: string[] = [];

  const dataLabel = offer.dataAllowanceSpeechLabel.trim();
  if (dataLabel) {
    segments.push(`${dataLabel} para navegar en red 5G`);
  }
  if (offer.unlimitedMinutes) segments.push("Minutos Libres");
  if (offer.unlimitedSms) segments.push("SMS Libres");

  if (offer.freeApps) {
    const apps = offer.freeAppNames.map((name) => name.trim()).filter(Boolean);
    if (apps.length === 0) {
      throw new Error(
        "El plan tiene Apps Libres habilitadas pero freeAppNames está vacío en la Oferta Comercial.",
      );
    }
    segments.push(`APPs Libres (${joinNaturalList(apps)})`);
  }

  if (offer.roamingWhatsapp) {
    if (offer.roamingGb != null && offer.roamingGb > 0) {
      segments.push(`Roaming Internacional (WhatsApp Libre + ${offer.roamingGb} GB)`);
    } else {
      segments.push("Roaming Internacional (WhatsApp Libre)");
    }
  }

  if (offer.pedidosYaPlus?.enabled) {
    const label = offer.pedidosYaTeleprompterLabel.trim();
    if (!label) {
      throw new Error(
        "El plan tiene PedidosYa Plus habilitado pero pedidosYaTeleprompterLabel está vacío en la Oferta Comercial.",
      );
    }
    segments.push(label);
  }

  if (offer.clubWom) {
    if (offer.clubWomListPartners) {
      const partners = offer.clubBenefits.map((name) => name.trim()).filter(Boolean);
      if (partners.length === 0) {
        throw new Error(
          "El plan requiere enumerar socios Club WOM pero clubBenefits está vacío en la Oferta Comercial.",
        );
      }
      segments.push(`acceso a Club WOM con descuentos en ${joinNaturalList(partners)}`);
    } else {
      segments.push("acceso a Club WOM");
    }
  }

  if (segments.length === 0) {
    throw new Error("La Oferta Comercial no tiene beneficios configurados para el Bloque 4 Con Equipo.");
  }

  return segments;
}

function buildSinglePlanBenefitsSpeech(plan: CommercialPlan): string {
  const offer = plan.offer;
  const heading = offer.teleprompterHeading.trim();
  if (!heading) {
    throw new Error(
      `El plan "${plan.name}" (${plan.id}) no tiene teleprompterHeading configurado para el Bloque 4 Con Equipo.`,
    );
  }

  const core = joinNaturalList(buildCoreBenefitSegments(offer));
  const mainParagraph = `${heading} : Este plan incluye sin costo adicional: ${core}.`;
  const equipmentSuffix = buildEquipmentBenefitsSuffix(offer);

  if (!equipmentSuffix) return mainParagraph;
  return `${mainParagraph} ${equipmentSuffix}`;
}

/** Bloque 4 — Beneficios del plan (Portabilidad con Equipo). */
export function buildBlock4PlanBenefitsConEquipoSpeech(ctx: ScriptBuildContext): string {
  const lineDetails = ctx.lineDetails;
  if (lineDetails.length === 0) {
    throw new Error("No hay líneas de venta para generar el Bloque 4 de Portabilidad con Equipo.");
  }

  const seen = new Set<string>();
  const speeches: string[] = [];

  for (const line of lineDetails) {
    if (seen.has(line.planId)) continue;
    seen.add(line.planId);

    if (!line.plan) {
      throw new Error(
        `El plan "${line.planId}" no tiene configuración comercial para el Bloque 4 Con Equipo.`,
      );
    }

    speeches.push(buildSinglePlanBenefitsSpeech(line.plan));
  }

  return speeches.join("\n\n");
}
