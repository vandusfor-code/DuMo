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
import { getConfig, setConfig } from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";

export interface CommercialConfigurationRepository {
  getSnapshot(): Promise<CommercialConfigSnapshot>;
  createPlan(input: UpsertCommercialPlanInput): Promise<CommercialPlan>;
  updatePlan(id: string, input: UpsertCommercialPlanInput): Promise<CommercialPlan>;
  duplicatePlan(id: string): Promise<CommercialPlan>;
  deletePlan(id: string): Promise<void>;
  updateSettings(input: UpdateCommercialSettingsInput): Promise<CommercialGlobalSettings>;
  resolveCommissionForPlan(planName: string): Promise<number>;
}

const PLANS_KEY = "commercial_plans";
const SETTINGS_KEY = "commercial_settings";

class PostgresCommercialConfigurationRepository implements CommercialConfigurationRepository {
  private async loadPlans(): Promise<CommercialPlan[]> {
    const stored = await getConfig<CommercialPlan[] | null>(PLANS_KEY, null);
    if (stored !== null) {
      return stored.length > 0 ? stored : [...COMMERCIAL_PLANS_MOCK];
    }
    try {
      await setConfig(PLANS_KEY, COMMERCIAL_PLANS_MOCK);
    } catch (err) {
      console.error("[commercial-config] seed plans", err);
    }
    return [...COMMERCIAL_PLANS_MOCK];
  }

  private async loadSettings(): Promise<CommercialGlobalSettings> {
    return getConfig(SETTINGS_KEY, { ...COMMERCIAL_SETTINGS_MOCK });
  }

  private async savePlans(plans: CommercialPlan[]) {
    await setConfig(PLANS_KEY, plans);
  }

  async getSnapshot() {
    const [plans, settings] = await Promise.all([this.loadPlans(), this.loadSettings()]);
    return { plans: [...plans], settings: { ...settings } };
  }

  async createPlan(input: UpsertCommercialPlanInput) {
    const plans = await this.loadPlans();
    const plan: CommercialPlan = { id: `plan-${Date.now()}`, ...input };
    plans.push(plan);
    await this.savePlans(plans);
    return plan;
  }

  async updatePlan(id: string, input: UpsertCommercialPlanInput) {
    const plans = await this.loadPlans();
    const idx = plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Plan no encontrado");
    plans[idx] = { ...plans[idx], ...input };
    await this.savePlans(plans);
    return plans[idx];
  }

  async duplicatePlan(id: string) {
    const plans = await this.loadPlans();
    const src = plans.find((p) => p.id === id);
    if (!src) throw new Error("Plan no encontrado");
    const copy: CommercialPlan = {
      ...src,
      id: `plan-${Date.now()}`,
      name: `${src.name} (copia)`,
    };
    plans.push(copy);
    await this.savePlans(plans);
    return copy;
  }

  async deletePlan(id: string) {
    const plans = await this.loadPlans();
    await this.savePlans(plans.filter((p) => p.id !== id));
  }

  async updateSettings(input: UpdateCommercialSettingsInput) {
    await setConfig(SETTINGS_KEY, { ...input });
    return { ...input };
  }

  async resolveCommissionForPlan(planName: string) {
    const plans = await this.loadPlans();
    return findPlanCommission(planName, plans);
  }
}

class MockCommercialConfigurationRepository implements CommercialConfigurationRepository {
  private plans = [...COMMERCIAL_PLANS_MOCK];
  private settings = { ...COMMERCIAL_SETTINGS_MOCK };

  getSnapshot() {
    return Promise.resolve({ plans: [...this.plans], settings: { ...this.settings } });
  }

  createPlan(input: UpsertCommercialPlanInput) {
    const plan: CommercialPlan = { id: `plan-${Date.now()}`, ...input };
    this.plans.push(plan);
    return Promise.resolve(plan);
  }

  updatePlan(id: string, input: UpsertCommercialPlanInput) {
    const idx = this.plans.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Plan no encontrado");
    this.plans[idx] = { ...this.plans[idx], ...input };
    return Promise.resolve(this.plans[idx]);
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
    return Promise.resolve(copy);
  }

  deletePlan(id: string) {
    this.plans = this.plans.filter((p) => p.id !== id);
    return Promise.resolve(undefined);
  }

  updateSettings(input: UpdateCommercialSettingsInput) {
    this.settings = { ...input };
    return Promise.resolve({ ...this.settings });
  }

  resolveCommissionForPlan(planName: string) {
    return Promise.resolve(findPlanCommission(planName, this.plans));
  }
}

export function getCommercialConfigurationRepository(): CommercialConfigurationRepository {
  if (hasDatabase()) return new PostgresCommercialConfigurationRepository();
  return new MockCommercialConfigurationRepository();
}
