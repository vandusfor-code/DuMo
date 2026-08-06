import type { CommercialPlan, CommercialPlanSpecs } from "@/types/commercial-config";
import { joinNaturalList, toBenefitPhrase } from "@/lib/sales-script/teleprompter/speech-utils";

function isActive(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return v !== "no" && v !== "no aplica" && v !== "n/a";
}

function normalizeLibres(raw: string, fallback: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower.includes("libre")) return fallback;
  return raw.replace(/\.$/, "");
}

function buildRoamingBenefit(specs: CommercialPlanSpecs): string | null {
  if (!isActive(specs.roaming)) return null;
  if (specs.roaming.includes("3 GB")) {
    return "WhatsApp Libre más 3 GB para Roaming Internacional";
  }
  if (/whatsapp/i.test(specs.roaming)) {
    return "WhatsApp Libre en roaming internacional";
  }
  return null;
}

function buildCouponBenefit(specs: CommercialPlanSpecs): string | null {
  if (!isActive(specs.cuponEquipos)) return null;
  if (specs.cuponEquipos.includes("24")) {
    return "un cupón del 10% de descuento para equipos y accesorios con tope de $100.000 cada 24 meses";
  }
  return "un cupón del 10% de descuento para equipos y accesorios con tope de $100.000 cada 12 meses";
}

function buildInstallmentBonusBenefit(specs: CommercialPlanSpecs): string | null {
  if (!isActive(specs.cuotasGratis)) return null;
  if (specs.cuotasGratis.includes("17")) {
    return "las cuotas 17 y 18 gratis al financiar un equipo";
  }
  return "la última cuota gratis al financiar un equipo";
}

/**
 * Ítems estructurados desde specs del catálogo comercial.
 * Fuente: Oferta Comercial Julio 2026 (Plan W, O, M).
 */
export function buildStructuredBenefitItems(plan: CommercialPlan): string[] {
  const specs = plan.specs;
  if (!specs) {
    return plan.benefits.map((b) => b.replace(/\.$/, ""));
  }

  const items: string[] = [];

  if (specs.gb) {
    items.push(`${specs.gb} para navegar en red 5G`);
  }
  if (isActive(specs.minutes) && isActive(specs.sms)) {
    items.push("minutos y SMS libres");
  } else {
    if (isActive(specs.minutes)) items.push(normalizeLibres(specs.minutes, "minutos libres"));
    if (isActive(specs.sms)) items.push(normalizeLibres(specs.sms, "SMS libres"));
  }
  if (isActive(specs.appsLibres)) {
    items.push("Apps Libres");
  }

  const roaming = buildRoamingBenefit(specs);
  if (roaming) items.push(roaming);

  if (isActive(specs.pedidosYa)) {
    items.push("suscripción incluida a PedidosYa Plus");
  }
  if (isActive(specs.clubWom)) {
    items.push("acceso a Club WOM");
  }

  const coupon = buildCouponBenefit(specs);
  if (coupon) items.push(coupon);

  const installment = buildInstallmentBonusBenefit(specs);
  if (installment) items.push(installment);

  return items;
}

/** @deprecated Solo compatibilidad — preferir discurso conversacional. */
export function formatBenefitBullets(items: string[]): string {
  return items.map((item) => `• ${item.replace(/^•\s*/, "")}`).join("\n");
}

/** Discurso conversacional del bloque Beneficios — prosa, no lista técnica. */
export function buildConversationalBenefitsSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan | null,
): string {
  const items = plan ? buildStructuredBenefitItems(plan) : [];
  const name = clientName.trim() || "estimado cliente";

  if (items.length === 0) {
    return `${name}, el ${planName} que acabas de contratar tiene un valor mensual transparente de ${planValueLabel}.`;
  }

  const phrases = items.map(toBenefitPhrase);
  const intro = `${name}, el ${planName} que acabas de contratar tiene un valor mensual transparente de ${planValueLabel}`;

  if (phrases.length <= 4) {
    return `${intro} e incluye ${joinNaturalList(phrases)}.`;
  }

  const mid = Math.ceil(phrases.length / 2);
  const first = joinNaturalList(phrases.slice(0, mid));
  const second = joinNaturalList(phrases.slice(mid));
  return `${intro} e incluye ${first}.\n\nAdemás, cuenta con ${second}.`;
}

/** Alias usado por el motor de bloques. */
export function buildPlanBenefitsSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan | null,
): string {
  return buildConversationalBenefitsSpeech(clientName, planName, planValueLabel, plan);
}
