import "server-only";

import type { CommercialPlan } from "@/types/commercial-config";
import type { Plan } from "@/types/lead";
import {
  commercialPlansToAdvisorOptions,
  NO_ACTIVE_COMMERCIAL_PLANS_MESSAGE,
} from "@/lib/commercial-plans-catalog";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";

export const commercialPlansService = {
  async getSnapshot(): Promise<{ plans: CommercialPlan[] }> {
    return getCommercialConfigurationRepository().getSnapshot();
  },

  /** Planes activos para el formulario de ventas — misma fuente que el teleprónter. */
  async getAdvisorPlanOptions(): Promise<Plan[]> {
    const { plans } = await this.getSnapshot();
    const options = commercialPlansToAdvisorOptions(plans);
    if (options.length === 0) {
      throw new Error(NO_ACTIVE_COMMERCIAL_PLANS_MESSAGE);
    }
    return options;
  },

  /** Catálogo comercial completo (activos e inactivos) para validación al generar script. */
  async getCommercialPlans(): Promise<CommercialPlan[]> {
    const { plans } = await this.getSnapshot();
    return plans;
  },
};
