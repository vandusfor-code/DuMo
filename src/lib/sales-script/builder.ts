import type { SaveLeadInput } from "@/types/lead";
import type { CommercialPlan } from "@/types/commercial-config";
import type { Plan } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildScriptContext } from "./context";
import { assembleGeneratedScript } from "./engine";
import { isScriptEligible } from "./eligibility";

export function buildSalesScript(input: {
  gestionId: string;
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  advisorPlans: Plan[];
  advisor?: { name: string; email: string };
}): GeneratedSalesScript | null {
  if (!isScriptEligible(input.gestion)) return null;

  const ctx = buildScriptContext({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    advisorPlans: input.advisorPlans,
    advisor: input.advisor,
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
