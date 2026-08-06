import type { SaveLeadInput } from "@/types/lead";
import type { CommercialPlan } from "@/types/commercial-config";
import type { Plan } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildScriptContext } from "./context";
import {
  buildPortabilityNoEquipmentSteps,
  flowKey,
  flowTitle,
} from "./official-blocks";

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

  const steps = buildPortabilityNoEquipmentSteps(ctx);
  const now = new Date().toISOString();

  return {
    id: `SCRIPT-${Date.now()}`,
    gestionId: input.gestionId,
    conversationId: input.gestion.conversationId,
    flowTitle: flowTitle(ctx),
    flowKey: flowKey(ctx),
    meta: {
      clientName: input.gestion.customerName,
      saleTypeLabel: ctx.vars.tipo_venta,
      planName: ctx.vars.plan,
      totalMonthlyLabel: ctx.vars.valor_total,
    },
    steps,
    createdAt: now,
  };
}
