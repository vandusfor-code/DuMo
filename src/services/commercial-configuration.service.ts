import "server-only";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import type {
  CommercialConfigSnapshot,
  CommercialPlan,
  CommercialGlobalSettings,
  UpsertCommercialPlanInput,
  UpdateCommercialSettingsInput,
} from "@/types/commercial-config";

export const commercialConfigurationService = {
  getSnapshot(): Promise<CommercialConfigSnapshot> {
    return getCommercialConfigurationRepository().getSnapshot();
  },
  createPlan(input: UpsertCommercialPlanInput): Promise<CommercialPlan> {
    return getCommercialConfigurationRepository().createPlan(input);
  },
  updatePlan(id: string, input: UpsertCommercialPlanInput): Promise<CommercialPlan> {
    return getCommercialConfigurationRepository().updatePlan(id, input);
  },
  duplicatePlan(id: string): Promise<CommercialPlan> {
    return getCommercialConfigurationRepository().duplicatePlan(id);
  },
  deletePlan(id: string): Promise<void> {
    return getCommercialConfigurationRepository().deletePlan(id);
  },
  updateSettings(input: UpdateCommercialSettingsInput): Promise<CommercialGlobalSettings> {
    return getCommercialConfigurationRepository().updateSettings(input);
  },
};
