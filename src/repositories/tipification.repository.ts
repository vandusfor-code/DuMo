import "server-only";
import { DEFAULT_TIPIFICATION_SEEDS } from "@/lib/tipification-seeds";
import { slugifyTipificationName } from "@/lib/tipification-colors";
import { sql, hasDatabase } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type {
  CreateTipificationInput,
  Tipification,
  UpdateTipificationInput,
} from "@/types/tipification";

export interface TipificationRepository {
  listActive(companyId: string): Promise<Tipification[]>;
  listAll(companyId: string): Promise<Tipification[]>;
  getById(companyId: string, id: string): Promise<Tipification | null>;
  getBySlug(companyId: string, slug: string): Promise<Tipification | null>;
  countUsageBySlug(companyId: string, slug: string): Promise<number>;
  create(companyId: string, input: CreateTipificationInput, createdBy: string): Promise<Tipification>;
  update(companyId: string, id: string, input: UpdateTipificationInput): Promise<Tipification>;
  reassignSlug(companyId: string, fromSlug: string, toSlug: string): Promise<number>;
  delete(companyId: string, id: string): Promise<void>;
}

function mapRow(r: Record<string, unknown>): Tipification {
  return {
    id: String(r.id),
    companyId: String(r.company_id),
    slug: String(r.slug),
    name: String(r.name),
    badgeBg: String(r.badge_bg),
    badgeText: String(r.badge_text),
    sortOrder: Number(r.sort_order) || 0,
    triggersSaleFlow: Boolean(r.triggers_sale_flow),
    status: String(r.status) === "inactive" ? "inactive" : "active",
    createdAt: new Date(String(r.created_at)).toISOString(),
    updatedAt: new Date(String(r.updated_at)).toISOString(),
    createdBy: String(r.created_by ?? "system"),
  };
}

function newTipificationId() {
  return `tipif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const mockStore: Tipification[] = DEFAULT_TIPIFICATION_SEEDS.map((seed) => ({
  ...seed,
  companyId: DEFAULT_COMPANY_ID,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: "system",
}));

function mockForCompany(companyId: string): Tipification[] {
  return mockStore.map((t) => ({ ...t, companyId }));
}

class MockTipificationRepository implements TipificationRepository {
  listActive(companyId: string) {
    return Promise.resolve(
      mockForCompany(companyId).filter((t) => t.status === "active"),
    );
  }

  listAll(companyId: string) {
    return Promise.resolve(mockForCompany(companyId));
  }

  getById(companyId: string, id: string) {
    return Promise.resolve(mockForCompany(companyId).find((t) => t.id === id) ?? null);
  }

  getBySlug(companyId: string, slug: string) {
    return Promise.resolve(mockForCompany(companyId).find((t) => t.slug === slug) ?? null);
  }

  countUsageBySlug() {
    return Promise.resolve(0);
  }

  async create(companyId: string, input: CreateTipificationInput, createdBy: string) {
    const slug = input.slug?.trim() || slugifyTipificationName(input.name);
    if (mockForCompany(companyId).some((t) => t.slug === slug)) {
      throw new Error("Ya existe una tipificación con ese identificador.");
    }
    const now = new Date().toISOString();
    const item: Tipification = {
      id: newTipificationId(),
      companyId,
      slug,
      name: input.name.trim(),
      badgeBg: input.badgeBg,
      badgeText: input.badgeText,
      sortOrder: input.sortOrder ?? mockStore.length + 1,
      triggersSaleFlow: input.triggersSaleFlow ?? false,
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    mockStore.push({ ...item, companyId: DEFAULT_COMPANY_ID });
    return item;
  }

  async update(companyId: string, id: string, input: UpdateTipificationInput) {
    const idx = mockStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Tipificación no encontrada.");
    const current = mockStore[idx]!;
    const updated: Tipification = {
      ...current,
      companyId,
      name: input.name?.trim() ?? current.name,
      badgeBg: input.badgeBg ?? current.badgeBg,
      badgeText: input.badgeText ?? current.badgeText,
      sortOrder: input.sortOrder ?? current.sortOrder,
      triggersSaleFlow: input.triggersSaleFlow ?? current.triggersSaleFlow,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };
    mockStore[idx] = { ...updated, companyId: DEFAULT_COMPANY_ID };
    return updated;
  }

  reassignSlug() {
    return Promise.resolve(0);
  }

  async delete(companyId: string, id: string) {
    const idx = mockStore.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Tipificación no encontrada.");
    mockStore.splice(idx, 1);
  }
}

class PostgresTipificationRepository implements TipificationRepository {
  async listActive(companyId: string) {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM tipifications
      WHERE company_id = ${companyId} AND status = 'active'
      ORDER BY sort_order ASC, name ASC
    `;
    return rows.map(mapRow);
  }

  async listAll(companyId: string) {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM tipifications
      WHERE company_id = ${companyId}
      ORDER BY sort_order ASC, name ASC
    `;
    return rows.map(mapRow);
  }

  async getById(companyId: string, id: string) {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM tipifications
      WHERE company_id = ${companyId} AND id = ${id}
      LIMIT 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async getBySlug(companyId: string, slug: string) {
    const rows = await sql<Record<string, unknown>[]>`
      SELECT * FROM tipifications
      WHERE company_id = ${companyId} AND slug = ${slug}
      LIMIT 1
    `;
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async countUsageBySlug(_companyId: string, slug: string) {
    const rows = await sql<{ total: number }[]>`
      SELECT (
        (SELECT count(*)::int FROM lead_gestiones WHERE gestion_type = ${slug}) +
        (SELECT count(*)::int FROM crm_clients WHERE gestion_type = ${slug})
      ) AS total
    `;
    return rows[0]?.total ?? 0;
  }

  async create(companyId: string, input: CreateTipificationInput, createdBy: string) {
    const slug = input.slug?.trim() || slugifyTipificationName(input.name);
    const existing = await this.getBySlug(companyId, slug);
    if (existing) throw new Error("Ya existe una tipificación con ese identificador.");

    const id = newTipificationId();
    const sortOrder =
      input.sortOrder ??
      Number(
        (
          await sql<{ max: number | null }[]>`
            SELECT max(sort_order)::int AS max FROM tipifications WHERE company_id = ${companyId}
          `
        )[0]?.max ?? 0,
      ) + 1;

    const rows = await sql<Record<string, unknown>[]>`
      INSERT INTO tipifications (
        id, company_id, slug, name, badge_bg, badge_text,
        sort_order, triggers_sale_flow, status, created_by
      )
      VALUES (
        ${id}, ${companyId}, ${slug}, ${input.name.trim()}, ${input.badgeBg}, ${input.badgeText},
        ${sortOrder}, ${input.triggersSaleFlow ?? false}, ${input.status ?? "active"}, ${createdBy}
      )
      RETURNING *
    `;
    return mapRow(rows[0]!);
  }

  async update(companyId: string, id: string, input: UpdateTipificationInput) {
    const current = await this.getById(companyId, id);
    if (!current) throw new Error("Tipificación no encontrada.");

    const rows = await sql<Record<string, unknown>[]>`
      UPDATE tipifications
      SET
        name = ${input.name?.trim() ?? current.name},
        badge_bg = ${input.badgeBg ?? current.badgeBg},
        badge_text = ${input.badgeText ?? current.badgeText},
        sort_order = ${input.sortOrder ?? current.sortOrder},
        triggers_sale_flow = ${input.triggersSaleFlow ?? current.triggersSaleFlow},
        status = ${input.status ?? current.status},
        updated_at = now()
      WHERE company_id = ${companyId} AND id = ${id}
      RETURNING *
    `;
    return mapRow(rows[0]!);
  }

  async reassignSlug(_companyId: string, fromSlug: string, toSlug: string) {
    const gestiones = await sql<{ count: number }[]>`
      WITH updated AS (
        UPDATE lead_gestiones SET gestion_type = ${toSlug}
        WHERE gestion_type = ${fromSlug}
        RETURNING 1
      )
      SELECT count(*)::int AS count FROM updated
    `;
    const clients = await sql<{ count: number }[]>`
      WITH updated AS (
        UPDATE crm_clients SET gestion_type = ${toSlug}
        WHERE gestion_type = ${fromSlug}
        RETURNING 1
      )
      SELECT count(*)::int AS count FROM updated
    `;
    return (gestiones[0]?.count ?? 0) + (clients[0]?.count ?? 0);
  }

  async delete(companyId: string, id: string) {
    const current = await this.getById(companyId, id);
    if (!current) throw new Error("Tipificación no encontrada.");
    await sql`
      DELETE FROM tipifications
      WHERE company_id = ${companyId} AND id = ${id}
    `;
  }
}

export function getTipificationRepository(): TipificationRepository {
  return hasDatabase() ? new PostgresTipificationRepository() : new MockTipificationRepository();
}
