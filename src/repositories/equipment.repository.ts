import "server-only";
import type {
  AdvisorEquipmentOption,
  EquipmentCatalogItem,
  EquipmentStatus,
  UpsertEquipmentInput,
} from "@/types/equipment";
import { EQUIPMENT_CATALOG_MOCK } from "@/data/mock/equipment.mock";
import { resolveEquipmentIsPieCero } from "@/lib/equipment-catalog";
import {
  EQUIPMENT_CATALOG_KEY,
  EQUIPMENT_CATALOG_SEEDED_KEY,
  getConfig,
  hasConfigKey,
  setConfig,
} from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";

export interface EquipmentRepository {
  /** carrier omitido = todos los operadores. */
  listAll(carrier?: string): Promise<EquipmentCatalogItem[]>;
  listActive(carrier?: string): Promise<AdvisorEquipmentOption[]>;
  create(input: UpsertEquipmentInput): Promise<EquipmentCatalogItem>;
  update(id: string, input: UpsertEquipmentInput): Promise<EquipmentCatalogItem>;
  setStatus(id: string, status: EquipmentStatus): Promise<EquipmentCatalogItem>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

function normalizeItem(raw: EquipmentCatalogItem): EquipmentCatalogItem {
  return {
    ...raw,
    totalValue: Number(raw.totalValue) || 0,
    downPayment: Number(raw.downPayment) || 0,
    installmentsCount: Number(raw.installmentsCount) || 0,
    installmentValue: Number(raw.installmentValue) || 0,
    carrier: raw.carrier ?? "wom",
    isPieCero: resolveEquipmentIsPieCero(raw),
    status: raw.status === "inactive" ? "inactive" : "active",
  };
}

function newEquipmentId() {
  return `eq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function shouldSeedDevMockOnFirstRun(): boolean {
  return process.env.NODE_ENV === "development";
}

class MockEquipmentRepository implements EquipmentRepository {
  private items: EquipmentCatalogItem[] = [...EQUIPMENT_CATALOG_MOCK];

  listAll(carrier?: string) {
    return Promise.resolve(
      [...this.items].filter((i) => !carrier || (i.carrier ?? "wom") === carrier),
    );
  }

  listActive(carrier?: string) {
    return Promise.resolve(
      this.items
        .filter((i) => i.status === "active" && (!carrier || (i.carrier ?? "wom") === carrier))
        .map(({ id, commercialName, brand, model, totalValue, downPayment, installmentsCount, installmentValue, commercialText }) => ({
          id,
          commercialName,
          brand,
          model,
          totalValue,
          downPayment,
          installmentsCount,
          installmentValue,
          commercialText,
        })),
    );
  }

  async create(input: UpsertEquipmentInput) {
    const item: EquipmentCatalogItem = normalizeItem({
      ...input,
      id: newEquipmentId(),
    });
    this.items.push(item);
    return item;
  }

  async update(id: string, input: UpsertEquipmentInput) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    this.items[idx] = normalizeItem({ ...input, id });
    return this.items[idx];
  }

  async setStatus(id: string, status: EquipmentStatus) {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    this.items[idx] = { ...this.items[idx], status };
    return this.items[idx];
  }

  async delete(id: string) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  async deleteAll() {
    this.items = [];
  }
}

class PostgresEquipmentRepository implements EquipmentRepository {
  private cache: EquipmentCatalogItem[] | null = null;

  private async markSeeded(): Promise<void> {
    await setConfig(EQUIPMENT_CATALOG_SEEDED_KEY, true);
  }

  private async persistCatalog(items: EquipmentCatalogItem[]): Promise<void> {
    this.cache = items.map(normalizeItem);
    await setConfig(EQUIPMENT_CATALOG_KEY, this.cache);
    await this.markSeeded();
  }

  /**
   * Catálogo ya inicializado si:
   * - flag equipment_catalog_seeded, o
   * - existe fila app_config.equipment_catalog (incluso con []).
   */
  private async isCatalogInitialized(): Promise<boolean> {
    const seeded = await getConfig(EQUIPMENT_CATALOG_SEEDED_KEY, false);
    if (seeded) return true;
    return hasConfigKey(EQUIPMENT_CATALOG_KEY);
  }

  private async load(): Promise<EquipmentCatalogItem[]> {
    if (this.cache) return this.cache;

    if (await this.isCatalogInitialized()) {
      const stored = await getConfig<EquipmentCatalogItem[]>(EQUIPMENT_CATALOG_KEY, []);
      this.cache = stored.map(normalizeItem);
      await this.markSeeded();
      return this.cache;
    }

    // Primera inicialización — mock solo en dev limpio; prod arranca vacío.
    const initial = shouldSeedDevMockOnFirstRun() ? [...EQUIPMENT_CATALOG_MOCK] : [];
    await this.persistCatalog(initial);
    return this.cache!;
  }

  async listAll(carrier?: string) {
    const items = await this.load();
    return items.filter((i) => !carrier || (i.carrier ?? "wom") === carrier);
  }

  async listActive(carrier?: string) {
    const items = await this.load();
    return items
      .filter((i) => i.status === "active" && (!carrier || (i.carrier ?? "wom") === carrier))
      .map(({ id, commercialName, brand, model, totalValue, downPayment, installmentsCount, installmentValue, commercialText }) => ({
        id,
        commercialName,
        brand,
        model,
        totalValue,
        downPayment,
        installmentsCount,
        installmentValue,
        commercialText,
      }));
  }

  async create(input: UpsertEquipmentInput) {
    const items = await this.load();
    const item = normalizeItem({ ...input, id: newEquipmentId() });
    await this.persistCatalog([...items, item]);
    return item;
  }

  async update(id: string, input: UpsertEquipmentInput) {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    const next = [...items];
    next[idx] = normalizeItem({ ...input, id });
    await this.persistCatalog(next);
    return next[idx];
  }

  async setStatus(id: string, status: EquipmentStatus) {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    const next = [...items];
    next[idx] = { ...next[idx], status };
    await this.persistCatalog(next);
    return next[idx];
  }

  async delete(id: string) {
    const items = await this.load();
    await this.persistCatalog(items.filter((i) => i.id !== id));
  }

  async deleteAll() {
    await this.persistCatalog([]);
  }
}

export function getEquipmentRepository(): EquipmentRepository {
  return hasDatabase() ? new PostgresEquipmentRepository() : new MockEquipmentRepository();
}
