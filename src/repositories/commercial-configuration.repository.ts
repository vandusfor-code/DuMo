import "server-only";
import type {
  CommercialConfigSnapshot,
  CommercialPlan,
  CommercialGlobalSettings,
  UpsertCommercialPlanInput,
  UpdateCommercialSettingsInput,
} from "@/types/commercial-config";
import {
  COMMERCIAL_PLANS_MOCK,
  COMMERCIAL_SETTINGS_MOCK,
  findPlanCommission,
} from "@/data/mock/commercial-config.mock";
import { withLatency } from "@/lib/mock";

export interface CommercialConfigurationRepository {
  getSnapshot(): Promise<CommercialConfigSnapshot>;
  createPlan(input: UpsertCommercialPlanInput): Promise<CommercialPlan>;
  updatePlan(id: string, input: UpsertCommercialPlanInput): Promise<CommercialPlan>;
  duplicatePlan(id: string): Promise<CommercialPlan>;
  deletePlan(id: string): Promise<void>;
  updateSettings(input: UpdateCommercialSettingsInput): Promise<CommercialGlobalSettings>;
  /** Resuelve comisión para un plan por nombre; usa config, nunca valores fijos en UI. */
  resolveCommissionForPlan(planName: string): Promise<number>;
}

class MockCommercialConfigurationRepository implements CommercialConfigurationRepository {
  private plans = [...COMMERCIAL_PLANS_MOCK];
  private settings = { ...COMMERCIAL_SETTINGS_MOCK };

  getSnapshot() {
    return withLatency({ plans: [...this.plans], settings: { ...this.settings } });
  }

  createPlan(input: UpsertCommercialPlanInput) {
    const plan: CommercialPlan = { id: `plan-${Date.now()}`, ...input };
    this.plans.push(plan);
    return withLatency(plan);
  }

  updatePlan(id: string, input: UpsertCommercialPlanInput) {
    const idx = this.plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Plan no encontrado");
    this.plans[idx] = { ...this.plans[idx], ...input };
    return withLatency(this.plans[idx]);
  }

  duplicatePlan(id: string) {
    const src = this.plans.find((p) => p.id === id);
    if (!src) throw new Error("Plan no encontrado");
    const copy: CommercialPlan = {
      ...src,
      id: `plan-${Date.now()}`,
      name: `${src.name} (copia)`,
    };
    this.plans.push(copy);
    return withLatency(copy);
  }

  deletePlan(id: string) {
    this.plans = this.plans.filter((p) => p.id !== id);
    return withLatency(undefined);
  }

  updateSettings(input: UpdateCommercialSettingsInput) {
    this.settings = { ...input };
    return withLatency({ ...this.settings });
  }

  resolveCommissionForPlan(planName: string) {
    return withLatency(findPlanCommission(planName, this.plans));
  }
}

export function getCommercialConfigurationRepository(): CommercialConfigurationRepository {
  return new MockCommercialConfigurationRepository();
}
