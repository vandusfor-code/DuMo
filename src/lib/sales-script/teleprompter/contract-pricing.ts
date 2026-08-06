import type { CommercialPlan } from "@/types/commercial-config";
import type { LineSpeechDetail } from "@/lib/sales-script/teleprompter/speech-builders";

function hasDistinctPlansPerLine(lineDetails: LineSpeechDetail[]): boolean {
  if (lineDetails.length <= 1) return false;
  const reference = lineDetails[0];
  return lineDetails.some(
    (line) => line.planName !== reference.planName || line.planValue !== reference.planValue,
  );
}

/** Plan W no admite líneas adicionales según Oferta Comercial vigente. */
export function validateTeleprompterLineRules(
  lineDetails: LineSpeechDetail[],
  mainPlan: CommercialPlan | null,
): string | null {
  if (lineDetails.length <= 1) return null;

  if (mainPlan?.id === "plan-w") {
    return "El Plan W no admite líneas adicionales según la Oferta Comercial.";
  }

  for (const line of lineDetails) {
    if (line.planId === "plan-w") {
      return "El Plan W no puede formar parte de una venta multilínea según la Oferta Comercial.";
    }
  }

  const additionalPrice = mainPlan?.offer.additionalLinePrice ?? 0;
  const maxAdditional = mainPlan?.offer.maxAdditionalLines ?? 0;
  if (additionalPrice <= 0 || maxAdditional <= 0) {
    return "El plan principal no admite líneas adicionales según la Oferta Comercial.";
  }

  const additionalCount = lineDetails.length - 1;
  if (additionalCount > maxAdditional) {
    return `El plan ${mainPlan?.name ?? "seleccionado"} admite como máximo ${maxAdditional} línea(s) adicional(es).`;
  }

  return null;
}

/**
 * Total mensual real según Oferta Comercial:
 * - Monolínea: valor transparente del plan principal.
 * - Multilínea homogénea: principal + adicionales × precio línea adicional.
 * - Multilínea heterogénea: suma del valor transparente de cada plan.
 */
export function computeTeleprompterMonthlyTotal(
  lineDetails: LineSpeechDetail[],
  mainPlan: CommercialPlan | null,
): number {
  if (lineDetails.length === 0) return 0;
  if (lineDetails.length === 1) return lineDetails[0].planValue;

  if (hasDistinctPlansPerLine(lineDetails)) {
    return lineDetails.reduce((sum, line) => sum + line.planValue, 0);
  }

  const additionalPrice =
    mainPlan?.offer.additionalLinePrice ?? mainPlan?.additionalLineValue ?? 0;
  const mainValue = lineDetails[0].planValue;
  return mainValue + (lineDetails.length - 1) * additionalPrice;
}

export function getAdditionalLineUnitPrice(mainPlan: CommercialPlan | null): number {
  return mainPlan?.offer.additionalLinePrice ?? mainPlan?.additionalLineValue ?? 0;
}
