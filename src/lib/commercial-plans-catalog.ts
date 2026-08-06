/**
 * Catálogo comercial — única fuente de verdad para planes de venta y teleprónter.
 * El formulario, el builder y la Oferta Comercial consumen los mismos IDs y datos.
 */

import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import type { Plan } from "@/types/lead";
import { isOfferConfigured } from "@/lib/commercial-plan-offer";
import {
  extractPlanServiceBenefitSegments,
} from "@/lib/sales-script/teleprompter/plan-benefits-speech";

export function commercialPlansToAdvisorOptions(plans: CommercialPlan[]): Plan[] {
  return plans
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      name: p.name,
      womValue: p.womValue,
    }));
}

function lineLabel(index: number, isMain: boolean): string {
  if (isMain) return "la línea principal";
  return `la línea adicional ${index + 1}`;
}

function planHasBenefitsForSpeech(plan: CommercialPlan): boolean {
  const segments = extractPlanServiceBenefitSegments(plan);
  if (segments.core.length > 0) return true;
  if (segments.hasClubWom) return true;
  if (plan.offer.pedidosYaPlus?.enabled) return true;
  if (plan.offer.handsetCoupon?.enabled) return true;
  if (plan.offer.freeDeviceInstallments?.enabled) return true;
  return false;
}

function isPlanBasicsConfigured(plan: CommercialPlan): boolean {
  return Boolean(plan.name.trim() && plan.womValue > 0);
}

/** Valida un plan comercial para generación de teleprónter. */
export function validateCommercialPlanForTeleprompter(
  plan: CommercialPlan | undefined,
  planId: string,
  lineIndex: number,
): string | null {
  const label = lineLabel(lineIndex, lineIndex === 0);

  if (!planId.trim()) {
    return `En ${label} no hay un plan seleccionado. Completa la gestión antes de generar el teleprónter.`;
  }

  if (!plan) {
    return `El plan "${planId}" de ${label} no existe en el catálogo comercial. Verifica la configuración en Oferta Comercial.`;
  }

  if (plan.status !== "active") {
    return `El plan "${plan.name}" (${plan.id}) de ${label} está deshabilitado. Actívalo en Oferta Comercial o selecciona otro plan.`;
  }

  if (!isPlanBasicsConfigured(plan)) {
    return `El plan "${plan.name}" (${plan.id}) de ${label} no tiene configuración comercial completa (nombre o valor mensual WOM).`;
  }

  if (!plan.offer || !isOfferConfigured(plan.offer)) {
    return `El plan "${plan.name}" (${plan.id}) de ${label} no tiene Oferta Comercial configurada. Completa la oferta en el módulo de administración.`;
  }

  if (!planHasBenefitsForSpeech(plan)) {
    return `El plan "${plan.name}" (${plan.id}) de ${label} no tiene beneficios configurados para el discurso del teleprónter.`;
  }

  return null;
}

/** Valida todos los planId de una gestión contra el catálogo comercial. */
export function validateGestionCommercialPlans(
  gestion: SaveLeadInput,
  commercialPlans: CommercialPlan[],
): string | null {
  const catalogById = new Map(commercialPlans.map((p) => [p.id, p]));

  for (let i = 0; i < gestion.lines.length; i++) {
    const line = gestion.lines[i];
    const plan = catalogById.get(line.planId);
    const error = validateCommercialPlanForTeleprompter(plan, line.planId, i);
    if (error) return error;
  }

  return null;
}

export const NO_ACTIVE_COMMERCIAL_PLANS_MESSAGE =
  "No hay planes comerciales activos configurados. Contacta al administrador para cargar la Oferta Comercial.";
