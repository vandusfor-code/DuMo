import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import { validateGestionCommercialPlans } from "@/lib/commercial-plans-catalog";
import {
  type DeliveryTeleprompterConfig,
  resolvePickupStore,
} from "@/lib/sales-script/teleprompter/delivery-config";
import { validateTeleprompterLineRules } from "@/lib/sales-script/teleprompter/contract-pricing";
import { buildLineDetails } from "@/lib/sales-script/teleprompter/speech-builders";

const DELIVERY_TYPE_REQUIRED_MESSAGE =
  "La gestión está incompleta: selecciona un tipo de entrega (despacho a domicilio o retiro en tienda) para generar el teleprompter.";

const PICKUP_STORE_REQUIRED_MESSAGE =
  "La gestión está incompleta: no hay sucursal configurada para retiro en tienda. Contacta al administrador para configurar la sucursal de entrega.";

export function getTeleprompterContextError(input: {
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  deliveryConfig: DeliveryTeleprompterConfig;
}): string | null {
  const lines = input.gestion.lines;
  if (lines.length === 0) {
    return "La gestión está incompleta: agrega al menos una línea de venta para generar el teleprompter.";
  }

  const planError = validateGestionCommercialPlans(input.gestion, input.commercialPlans);
  if (planError) return planError;

  const mainLine = lines[0];
  const deliveryType = mainLine.deliveryType;

  if (deliveryType !== "home" && deliveryType !== "store") {
    return DELIVERY_TYPE_REQUIRED_MESSAGE;
  }

  if (deliveryType === "store") {
    const store = resolvePickupStore(input.deliveryConfig, null);
    if (!store) return PICKUP_STORE_REQUIRED_MESSAGE;
  }

  const lineDetails = buildLineDetails({
    lines: input.gestion.lines,
    commercialPlans: input.commercialPlans,
  });

  const mainPlan = input.commercialPlans.find((plan) => plan.id === mainLine.planId) ?? null;
  return validateTeleprompterLineRules(lineDetails, mainPlan);
}

export { DELIVERY_TYPE_REQUIRED_MESSAGE };
