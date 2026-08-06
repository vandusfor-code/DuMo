import type { SaveLeadInput } from "@/types/lead";
import type { CommercialPlan } from "@/types/commercial-config";
import type { Plan } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildScriptContext } from "./context";
import { assembleGeneratedScript } from "./engine";

export function buildSalesScript(input: {
  gestionId: string;
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  advisorPlans: Plan[];
  advisor?: { name: string; email: string };
}): GeneratedSalesScript | null {
  const ctx = buildScriptContext({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    advisorPlans: input.advisorPlans,
    advisor: input.advisor,
  });
  if (!ctx) return null;

  if (ctx.hasEquipment) {
    // Futuro: PORTABILIDAD_CON_EQUIPO con su documento oficial
    return null;
  }

  if (ctx.saleType !== "portability") {
    // Futuro: otros flujos con documentos oficiales
    return null;
  }

  return assembleGeneratedScript({
    gestionId: input.gestionId,
    conversationId: input.gestion.conversationId,
    ctx,
    meta: {
      clientName: input.gestion.customerName,
      saleTypeLabel: ctx.vars.tipo_venta,
      planName: ctx.vars.plan,
      totalMonthlyLabel: ctx.vars.valor_total,
    },
  });
}
