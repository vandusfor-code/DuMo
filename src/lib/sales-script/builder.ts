import type { SaveLeadInput } from "@/types/lead";
import type { CommercialPlan } from "@/types/commercial-config";
import type { EquipmentCatalogItem } from "@/types/equipment";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildScriptContext, getTeleprompterContextError } from "./context";
import { assembleGeneratedScript } from "./engine";
import { getScriptUnavailableReason, isScriptEligible } from "./eligibility";
import { resolveScriptFlow } from "./flows/registry";
import type { DeliveryTeleprompterConfig } from "@/lib/sales-script/teleprompter/delivery-config";

const SCRIPT_DEBUG = "[script-debug]";

function logScriptBuildCheckpoint(label: string, payload: Record<string, unknown>) {
  console.log(`${SCRIPT_DEBUG} ${label}`, JSON.stringify(payload, null, 2));
}

export function getScriptBuildError(input: {
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  equipmentCatalog?: EquipmentCatalogItem[];
  deliveryConfig: DeliveryTeleprompterConfig;
}): string | null {
  const eligibilityReason = getScriptUnavailableReason(input.gestion);
  if (eligibilityReason) return eligibilityReason;

  return getTeleprompterContextError({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    equipmentCatalog: input.equipmentCatalog,
    deliveryConfig: input.deliveryConfig,
  });
}

export function buildSalesScript(input: {
  gestionId: string;
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  equipmentCatalog?: EquipmentCatalogItem[];
  advisor?: { name: string; email: string };
  deliveryConfig: DeliveryTeleprompterConfig;
}): GeneratedSalesScript | null {
  const main = input.gestion.lines[0];
  const eligible = isScriptEligible(input.gestion);

  logScriptBuildCheckpoint("buildSalesScript · entrada", {
    gestionId: input.gestionId,
    conversationId: input.gestion.conversationId,
    saleType: main?.saleType ?? null,
    equipmentMode: main?.equipmentMode ?? null,
    equipmentCatalogId: main?.equipmentCatalogId ?? null,
    isScriptEligible: eligible,
  });

  if (!eligible) {
    logScriptBuildCheckpoint("buildSalesScript · detenido", {
      reason: "isScriptEligible === false",
      getScriptUnavailableReason: getScriptUnavailableReason(input.gestion),
    });
    return null;
  }

  logScriptBuildCheckpoint("buildSalesScript · ejecutando buildScriptContext", {
    gestionId: input.gestionId,
  });

  const ctx = buildScriptContext({
    gestion: input.gestion,
    commercialPlans: input.commercialPlans,
    equipmentCatalog: input.equipmentCatalog,
    advisor: input.advisor,
    deliveryConfig: input.deliveryConfig,
  });

  if (!ctx) {
    logScriptBuildCheckpoint("buildSalesScript · detenido", {
      reason: "buildScriptContext devolvió null",
      getTeleprompterContextError: getTeleprompterContextError({
        gestion: input.gestion,
        commercialPlans: input.commercialPlans,
        equipmentCatalog: input.equipmentCatalog,
        deliveryConfig: input.deliveryConfig,
      }),
    });
    return null;
  }

  const flow = resolveScriptFlow(ctx);
  logScriptBuildCheckpoint("buildSalesScript · resolveScriptFlow", {
    flowKey: flow.key,
    flowTitle: flow.title,
    hasEquipment: ctx.hasEquipment,
    saleType: ctx.saleType,
  });

  const script = assembleGeneratedScript({
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

  logScriptBuildCheckpoint("buildSalesScript · script ensamblado", {
    scriptId: script.id,
    flowKey: script.flowKey,
    stepsCount: script.steps.length,
  });

  return script;
}
