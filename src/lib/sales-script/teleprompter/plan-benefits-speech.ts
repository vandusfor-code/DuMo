/**
 * Bloque 4 — Beneficios del plan ✅ Aprobado v1.0 (congelado).
 * Responde: ¿Qué incluye el plan que acabas de contratar?
 * No modificar salvo cambio del script oficial o de la Oferta Comercial.
 */

import type { CommercialPlan } from "@/types/commercial-config";
import type { LineSpeechDetail } from "@/lib/sales-script/teleprompter/speech-builders";
import { joinNaturalList } from "@/lib/sales-script/teleprompter/speech-utils";

/** Segmentos de beneficio de servicio — excluye condiciones comerciales detalladas (Bloque 3). */
export type PlanServiceBenefitSegments = {
  core: string[];
  hasClubWom: boolean;
  clubPartners: string[];
};

const MULTILINE_SAME_PLAN_CLOSING =
  "Estos beneficios estarán disponibles para todas las líneas contratadas bajo ese mismo plan.";

const SPEECH_CONNECTORS = [
  "Además",
  "También",
  "Por otra parte",
  "Como beneficio adicional",
  "Igualmente",
] as const;

/** Extrae beneficios de servicio desde la Oferta Comercial estructurada. */
export function extractPlanServiceBenefitSegments(plan: CommercialPlan): PlanServiceBenefitSegments {
  const o = plan.offer;
  const core: string[] = [];

  if (o.dataAllowance.trim()) {
    core.push(`${o.dataAllowance} para navegar en red 5G`);
  }
  if (o.unlimitedMinutes) core.push("minutos libres");
  if (o.unlimitedSms) core.push("SMS libres");
  if (o.freeApps) core.push("Apps Libres");

  if (o.roamingWhatsapp && o.roamingGb) {
    core.push(
      `WhatsApp Libre y ${o.roamingGb} GB de navegación en Roaming Internacional en más de 100 países`,
    );
  } else if (o.roamingWhatsapp) {
    core.push("WhatsApp Libre en Roaming Internacional en más de 100 países");
  }

  return {
    core,
    hasClubWom: o.clubWom,
    clubPartners: o.clubBenefits ?? [],
  };
}

/** Ítems de beneficio de servicio para metadatos del contexto. */
export function buildStructuredBenefitItems(plan: CommercialPlan): string[] {
  return extractPlanServiceBenefitSegments(plan).core;
}

function prefixWithConnector(connector: string, body: string): string {
  const trimmed = body.trim();
  const normalized = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  const withPeriod = normalized.endsWith(".") ? normalized : `${normalized}.`;
  return `${connector}, ${withPeriod}`;
}

/** Aplica conectores conversacionales sin repetir el mismo consecutivamente. */
function applySpeechConnectors(bodies: string[]): string[] {
  if (bodies.length === 0) return [];

  const connectors: string[] = [];
  let poolIndex = 0;

  for (let i = 0; i < bodies.length; i++) {
    let connector = SPEECH_CONNECTORS[poolIndex % SPEECH_CONNECTORS.length];
    if (connectors.length > 0 && connector === connectors[connectors.length - 1]) {
      poolIndex++;
      connector = SPEECH_CONNECTORS[poolIndex % SPEECH_CONNECTORS.length];
    }
    connectors.push(connector);
    poolIndex++;
  }

  return bodies.map((body, index) => prefixWithConnector(connectors[index], body));
}

function buildClubWomBody(partners: string[]): string {
  if (partners.length > 0) {
    return `tendrás acceso al Club WOM desde el primer día, donde podrás disfrutar de descuentos y beneficios exclusivos en comercios asociados como ${partners.join(", ")} y otros`;
  }
  return "tendrás acceso al Club WOM desde el primer día, donde podrás disfrutar de descuentos y beneficios exclusivos en comercios asociados";
}

function buildPedidosYaBody(plan: CommercialPlan): string | null {
  const py = plan.offer.pedidosYaPlus;
  if (!py?.enabled) return null;

  const conditions = py.conditions.trim();
  if (conditions) {
    const normalized = conditions.endsWith(".") ? conditions : `${conditions}.`;
    return `este plan incluye una suscripción a PedidosYa Plus. ${normalized}`;
  }
  return "este plan incluye una suscripción a PedidosYa Plus";
}

function buildHandsetCouponBody(plan: CommercialPlan): string | null {
  if (!plan.offer.handsetCoupon?.enabled) return null;
  return "con este plan tendrás un cupón de descuento para la compra de equipos y accesorios";
}

function buildFreeInstallmentsBody(plan: CommercialPlan): string | null {
  const fi = plan.offer.freeDeviceInstallments;
  if (!fi?.enabled || fi.installmentNumbers.length === 0) return null;

  const count = fi.installmentNumbers.length;
  if (count === 1) {
    return "si decides financiar un equipo con WOM, la última cuota será completamente gratis";
  }
  if (count === 2) {
    return "si decides financiar un equipo con WOM, las dos últimas cuotas serán completamente gratis";
  }

  const countWords: Record<number, string> = {
    3: "tres",
    4: "cuatro",
    5: "cinco",
    6: "seis",
  };
  const label = countWords[count] ?? `${count}`;
  return `si decides financiar un equipo con WOM, las ${label} últimas cuotas serán completamente gratis`;
}

function buildPlanIntroSubject(
  clientName: string,
  planName: string,
  planValueLabel: string,
  rolePrefix?: string,
): string {
  const name = clientName.trim() || "estimado cliente";
  const planRef = `el ${planName} que acabas de contratar, por un valor mensual de ${planValueLabel}, incluye`;
  if (rolePrefix) {
    return `En ${rolePrefix}, ${planRef}`;
  }
  return `${name}, ${planRef}`;
}

function buildSegmentsSpeech(
  segments: PlanServiceBenefitSegments,
  subject: string,
  plan: CommercialPlan,
): string {
  const parts: string[] = [];

  const supplementary: string[] = [];

  if (segments.hasClubWom) {
    supplementary.push(buildClubWomBody(segments.clubPartners));
  }

  const pedidosYa = buildPedidosYaBody(plan);
  if (pedidosYa) supplementary.push(pedidosYa);

  const coupon = buildHandsetCouponBody(plan);
  if (coupon) supplementary.push(coupon);

  const installments = buildFreeInstallmentsBody(plan);
  if (installments) supplementary.push(installments);

  if (segments.core.length > 0) {
    parts.push(`${subject} ${joinNaturalList(segments.core)}.`);
  } else if (supplementary.length === 0) {
    throw new Error(
      `El plan "${plan.name}" (${plan.id}) no tiene beneficios configurados para el Bloque 4.`,
    );
  } else {
    parts.push(`${subject.replace(/, incluye$/, "")}.`);
  }

  parts.push(...applySpeechConnectors(supplementary));

  return parts.join("\n\n");
}

function buildSinglePlanSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan,
): string {
  const segments = extractPlanServiceBenefitSegments(plan);
  const subject = buildPlanIntroSubject(clientName, planName, planValueLabel);
  return buildSegmentsSpeech(segments, subject, plan);
}

function buildHeterogeneousPlanSpeech(line: LineSpeechDetail): string {
  if (!line.plan) {
    throw new Error(
      `El plan "${line.planId}" de ${line.isMain ? "la línea principal" : `la línea adicional ${line.index + 1}`} no tiene configuración comercial para el Bloque 4.`,
    );
  }

  const segments = extractPlanServiceBenefitSegments(line.plan);
  const role = line.isMain ? "tu línea principal" : `tu línea adicional ${line.index}`;
  const subject = buildPlanIntroSubject("", line.planName, line.planValueLabel, role);
  return buildSegmentsSpeech(segments, subject, line.plan);
}

export function buildBlock4BenefitsSpeech(
  clientName: string,
  lineDetails: LineSpeechDetail[],
): string {
  if (lineDetails.length === 0) {
    throw new Error("No hay líneas de venta para generar el Bloque 4 de beneficios.");
  }

  const uniquePlanIds = new Set(lineDetails.map((l) => l.planId));

  if (uniquePlanIds.size === 1) {
    const main = lineDetails.find((l) => l.isMain) ?? lineDetails[0];
    if (!main.plan) {
      throw new Error(
        `El plan "${main.planId}" no tiene configuración comercial para el Bloque 4.`,
      );
    }
    const speech = buildSinglePlanSpeech(
      clientName,
      main.planName,
      main.planValueLabel,
      main.plan,
    );
    if (lineDetails.length > 1) {
      return `${speech}\n\n${MULTILINE_SAME_PLAN_CLOSING}`;
    }
    return speech;
  }

  const seen = new Set<string>();
  const parts: string[] = [];
  for (const line of lineDetails) {
    if (seen.has(line.planId)) continue;
    seen.add(line.planId);
    parts.push(buildHeterogeneousPlanSpeech(line));
  }

  return parts.join("\n\n");
}

/** @deprecated Usar buildBlock4BenefitsSpeech */
export function buildConversationalBenefitsSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan,
): string {
  return buildSinglePlanSpeech(clientName, planName, planValueLabel, plan);
}

/** @deprecated Usar buildBlock4BenefitsSpeech */
export function buildPlanBenefitsSpeech(
  clientName: string,
  planName: string,
  planValueLabel: string,
  plan: CommercialPlan,
): string {
  return buildConversationalBenefitsSpeech(clientName, planName, planValueLabel, plan);
}
