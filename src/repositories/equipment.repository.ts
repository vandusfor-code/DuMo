import "server-only";
import type {
  AdvisorEquipmentOption,
  EquipmentCatalogItem,
  EquipmentStatus,
  UpsertEquipmentInput,
} from "@/types/equipment";
import { EQUIPMENT_CATALOG_MOCK } from "@/data/mock/equipment.mock";
import { getConfig, setConfig } from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";

const CATALOG_KEY = "equipment_catalog";

export interface EquipmentRepository {
  listAll(): Promise<EquipmentCatalogItem[]>;
  listActive(): Promise<AdvisorEquipmentOption[]>;
  create(input: UpsertEquipmentInput): Promise<EquipmentCatalogItem>;
  update(id: string, input: UpsertEquipmentInput): Promise<EquipmentCatalogItem>;
  setStatus(id: string, status: EquipmentStatus): Promise<EquipmentCatalogItem>;
  delete(id: string): Promise<void>;
}

function normalizeItem(raw: EquipmentCatalogItem): EquipmentCatalogItem {
  return {
    ...raw,
    totalValue: Number(raw.totalValue) || 0,
    downPayment: Number(raw.downPayment) || 0,
    installmentsCount: Number(raw.installmentsCount) || 0,
    installmentValue: Number(raw.installmentValue) || 0,
    status: raw.status === "inactive" ? "inactive" : "active",
  };
}

class MockEquipmentRepository implements EquipmentRepository {
  private items: EquipmentCatalogItem[] = [...EQUIPMENT_CATALOG_MOCK];

  listAll() {
    return Promise.resolve([...this.items]);
  }

  listActive() {
    return Promise.resolve(
      this.items
        .filter((i) => i.status === "active")
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
      id: `eq-${Date.now()}`,
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
}

class PostgresEquipmentRepository implements EquipmentRepository {
  private cache: EquipmentCatalogItem[] | null = null;

  private async load(): Promise<EquipmentCatalogItem[]> {
    if (this.cache) return this.cache;
    const stored = await getConfig<EquipmentCatalogItem[] | null>(CATALOG_KEY, null);
    if (stored && stored.length > 0) {
      this.cache = stored.map(normalizeItem);
      return this.cache;
    }
    this.cache = [...EQUIPMENT_CATALOG_MOCK];
    try {
      await setConfig(CATALOG_KEY, this.cache);
    } catch {
      /* seed best-effort */
    }
    return this.cache;
  }

  private async save(items: EquipmentCatalogItem[]) {
    this.cache = items.map(normalizeItem);
    await setConfig(CATALOG_KEY, this.cache);
  }

  async listAll() {
    return [...(await this.load())];
  }

  async listActive() {
    const items = await this.load();
    return items
      .filter((i) => i.status === "active")
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
    const item = normalizeItem({ ...input, id: `eq-${Date.now()}` });
    await this.save([...items, item]);
    return item;
  }

  async update(id: string, input: UpsertEquipmentInput) {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    const next = [...items];
    next[idx] = normalizeItem({ ...input, id });
    await this.save(next);
    return next[idx];
  }

  async setStatus(id: string, status: EquipmentStatus) {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error("Equipo no encontrado.");
    const next = [...items];
    next[idx] = { ...next[idx], status };
    await this.save(next);
    return next[idx];
  }

  async delete(id: string) {
    const items = await this.load();
    await this.save(items.filter((i) => i.id !== id));
  }
}

export function getEquipmentRepository(): EquipmentRepository {
  return hasDatabase()
    ? new PostgresEquipmentRepository()
    : new MockEquipmentRepository();
}
