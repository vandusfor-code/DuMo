import type { SaveLeadInput } from "@/types/lead";
import type { CommercialPlan } from "@/types/commercial-config";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildScriptContext, getTeleprompterContextError } from "./context";
import { assembleGeneratedScript } from "./engine";
import { getScriptUnavailableReason, isScriptEligible } from "./eligibility";
import type { DeliveryTeleprompterConfig } from "@/lib/sales-script/teleprompter/delivery-config";

export function getScriptBuildError(input: {
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  deliveryConfig: DeliveryTeleprompterConfig;
}): string | null {
  const eligibilityReason = getScriptUnavailableReason(input.gestion);
  if (eligibilityReason) return eligibilityReason;

  return getTeleprompterContextError({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    deliveryConfig: input.deliveryConfig,
  });
}

export function buildSalesScript(input: {
  gestionId: string;
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  advisor?: { name: string; email: string };
  deliveryConfig: DeliveryTeleprompterConfig;
}): GeneratedSalesScript | null {
  if (!isScriptEligible(input.gestion)) return null;

  const ctx = buildScriptContext({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    advisor: input.advisor,
    deliveryConfig: input.deliveryConfig,
  });
  if (!ctx) return null;

  return assembleGeneratedScript({
    gestionId: input.gestionId,
    conversationId: input.gestion.conversationId,
    ctx,
    meta: {
      clientName: input.gestion.customerName,
      saleTypeLabel: ctx.vars.tipo_venta,
      planName: ctx.vars.plan,
      totalMonthlyLabel: ctx.vars.total_mensual,
      advisorSummary: {
        currentOperator: ctx.vars.operador_actual || "—",
        deliveryLabel: ctx.vars.tipo_entrega || "—",
        deliveryDate: ctx.vars.fecha_entrega || "—",
        lineCount: ctx.lineCount,
        planValueLabel: ctx.vars.valor_plan,
      },
    },
  });
}
