import "server-only";
import type { SaveLeadInput } from "@/types/lead";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { buildSalesScript } from "@/lib/sales-script/builder";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { getDeliveryConfigurationRepository } from "@/repositories/delivery-configuration.repository";
import { getLeadRepository } from "@/repositories/leads.repository";

export const salesScriptService = {
  async generateAndSave(input: {
    gestionId: string;
    gestion: SaveLeadInput;
    advisor?: { name: string; email: string };
  }): Promise<GeneratedSalesScript | null> {
    if (input.gestion.type !== "venta" || input.gestion.lines.length === 0) {
      return null;
    }

    const [commercialConfig, advisorPlans, deliveryConfig] = await Promise.all([
      getCommercialConfigurationRepository().getSnapshot(),
      getLeadRepository().getPlans(),
      getDeliveryConfigurationRepository().getConfig(),
    ]);

    const script = buildSalesScript({
      gestionId: input.gestionId,
      gestion: input.gestion,
      commercialPlans: commercialConfig.plans,
      advisorPlans,
      advisor: input.advisor,
      deliveryConfig,
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
