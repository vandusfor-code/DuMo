import "server-only";
import type { DeliveryTeleprompterConfig } from "@/lib/sales-script/teleprompter/delivery-config";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "@/data/defaults/delivery-stores.default";
import { getConfig, setConfig } from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";

const DELIVERY_CONFIG_KEY = "delivery_teleprompter_config";

export interface DeliveryConfigurationRepository {
  /** Sucursales y defaults para el Bloque 5 — retiro en tienda. */
  getConfig(): Promise<DeliveryTeleprompterConfig>;
  /** Persiste el listado oficial de sucursales (admin / migración). */
  saveConfig(config: DeliveryTeleprompterConfig): Promise<DeliveryTeleprompterConfig>;
}

function normalizeConfig(raw: DeliveryTeleprompterConfig | null): DeliveryTeleprompterConfig {
  if (!raw || !Array.isArray(raw.pickupStores)) {
    return { ...DEFAULT_DELIVERY_TELEPROMPTER_CONFIG, pickupStores: [...DEFAULT_DELIVERY_TELEPROMPTER_CONFIG.pickupStores] };
  }
  return {
    defaultPickupStoreId: raw.defaultPickupStoreId ?? null,
    pickupStores: raw.pickupStores.filter(
      (store) => store.id && store.name && store.address && store.schedule,
    ),
  };
}

class PostgresDeliveryConfigurationRepository implements DeliveryConfigurationRepository {
  private cache: DeliveryTeleprompterConfig | null = null;

  async getConfig(): Promise<DeliveryTeleprompterConfig> {
    if (this.cache) return this.cache;
    const stored = await getConfig<DeliveryTeleprompterConfig | null>(DELIVERY_CONFIG_KEY, null);
    if (stored && stored.pickupStores.length > 0) {
      this.cache = normalizeConfig(stored);
      return this.cache;
    }
    try {
      await setConfig(DELIVERY_CONFIG_KEY, DEFAULT_DELIVERY_TELEPROMPTER_CONFIG);
    } catch (err) {
      console.error("[delivery-config] seed stores", err);
    }
    this.cache = normalizeConfig(DEFAULT_DELIVERY_TELEPROMPTER_CONFIG);
    return this.cache;
  }

  async saveConfig(config: DeliveryTeleprompterConfig): Promise<DeliveryTeleprompterConfig> {
    const normalized = normalizeConfig(config);
    await setConfig(DELIVERY_CONFIG_KEY, normalized);
    this.cache = normalized;
    return normalized;
  }
}

class InMemoryDeliveryConfigurationRepository implements DeliveryConfigurationRepository {
  private config: DeliveryTeleprompterConfig = normalizeConfig(DEFAULT_DELIVERY_TELEPROMPTER_CONFIG);

  getConfig(): Promise<DeliveryTeleprompterConfig> {
    return Promise.resolve({ ...this.config, pickupStores: [...this.config.pickupStores] });
  }

  saveConfig(config: DeliveryTeleprompterConfig): Promise<DeliveryTeleprompterConfig> {
    this.config = normalizeConfig(config);
    return Promise.resolve({ ...this.config, pickupStores: [...this.config.pickupStores] });
  }
}

export function getDeliveryConfigurationRepository(): DeliveryConfigurationRepository {
  if (hasDatabase()) return new PostgresDeliveryConfigurationRepository();
  return new InMemoryDeliveryConfigurationRepository();
}
