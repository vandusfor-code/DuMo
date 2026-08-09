import "server-only";
import type { SaveLeadInput } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildSalesScript } from "@/lib/sales-script/builder";
import { resolveScriptFlow } from "@/lib/sales-script/flows/registry";
import { buildScriptContext } from "@/lib/sales-script/context";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { getDeliveryConfigurationRepository } from "@/repositories/delivery-configuration.repository";
import { getLeadRepository } from "@/repositories/leads.repository";
import { equipmentService } from "@/services/equipment.service";
import { teleprompterScriptService } from "@/services/teleprompter-script.service";
import { tipificationService } from "@/services/tipification.service";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { isScriptFlowKey } from "@/lib/sales-script/cms/flow-registry";

export const salesScriptService = {
  async generateAndSave(input: {
    gestionId: string;
    gestion: SaveLeadInput;
    advisor?: { name: string; email: string };
    companyId?: string;
    isSaleFlowType?: boolean;
  }): Promise<GeneratedSalesScript | null> {
    const companyId = input.companyId ?? DEFAULT_COMPANY_ID;
    const isSaleFlow =
      input.isSaleFlowType ??
      (await tipificationService.triggersSaleFlowForSlug(companyId, input.gestion.type));
    if (!isSaleFlow || input.gestion.lines.length === 0) {
      return null;
    }

    const [commercialConfig, deliveryConfig, equipmentCatalog] = await Promise.all([
      getCommercialConfigurationRepository().getSnapshot(),
      getDeliveryConfigurationRepository().getConfig(),
      equipmentService.listAll(),
    ]);

    const ctx = buildScriptContext({
      gestion: input.gestion,
      commercialPlans: commercialConfig.plans,
      equipmentCatalog,
      advisor: input.advisor,
      deliveryConfig,
    });

    let overrides;
    if (ctx) {
      const flow = resolveScriptFlow(ctx);
      if (isScriptFlowKey(flow.key)) {
        overrides = await teleprompterScriptService.getOverridesForFlow(
          DEFAULT_COMPANY_ID,
          flow.key,
        );
      }
    }

    const script = buildSalesScript({
      gestionId: input.gestionId,
      gestion: input.gestion,
      commercialPlans: commercialConfig.plans,
      equipmentCatalog,
      advisor: input.advisor,
      deliveryConfig,
      overrides,
      isSaleFlowType: isSaleFlow,
    });

    if (!script) return null;

    try {
      await getLeadRepository().saveSalesScript(input.gestionId, script);
    } catch (error) {
      console.error("[salesScriptService] persist failed", error);
    }
    return script;
  },

  getLatestForConversation(conversationId: string): Promise<GeneratedSalesScript | null> {
    return getLeadRepository().getLatestSalesScript(conversationId);
  },
};
