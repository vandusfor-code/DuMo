import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import type { LeadType } from "@/types/lead";
import type { CrmClient, CrmClientFilters } from "@/types/crm-client";
import { LEAD_TYPE_LABELS } from "@/types/lead";
import { ensureSchema, getSql, hasDatabase, withDbRetry } from "@/server/db/client";

type ClientRow = {
  id: string;
  conversation_id: string;
  customer_name: string;
  rut: string;
  phone: string;
  gestion_type: string;
  advisor_id: string;
  advisor_name: string;
  has_sale: boolean;
  updated_at: string | Date;
};

function rowToClient(row: ClientRow): CrmClient {
  const updatedAt =
    row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    customerName: row.customer_name,
    rut: row.rut,
    phone: row.phone,
    gestionType: row.gestion_type as LeadType,
    advisorId: row.advisor_id,
    advisorName: row.advisor_name,
    hasSale: Boolean(row.has_sale),
    updatedDate: updatedAt.slice(0, 10),
    updatedAt,
  };
}

export interface CrmClientsRepository {
  upsert(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: LeadType;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }): Promise<void>;
  list(scope: AdvisorScope | null, filters?: CrmClientFilters): Promise<CrmClient[]>;
}

class PostgresCrmClientsRepository implements CrmClientsRepository {
  async upsert(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: LeadType;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return;

    const id = `CRM-${input.conversationId}-${input.advisorId}`;
    const now = new Date().toISOString();

    await withDbRetry(() =>
      sql`
        INSERT INTO crm_clients (
          id, conversation_id, customer_name, rut, phone, gestion_type,
          advisor_id, advisor_name, has_sale, updated_at, created_at
        ) VALUES (
          ${id}, ${input.conversationId}, ${input.customerName}, ${input.rut},
          ${input.phone}, ${input.gestionType}, ${input.advisorId},
          ${input.advisorName}, ${input.hasSale}, ${now}, ${now}
        )
        ON CONFLICT (conversation_id, advisor_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          rut = EXCLUDED.rut,
          phone = EXCLUDED.phone,
          gestion_type = EXCLUDED.gestion_type,
          advisor_name = EXCLUDED.advisor_name,
          has_sale = crm_clients.has_sale OR EXCLUDED.has_sale,
          updated_at = EXCLUDED.updated_at
      `,
    );
  }

  async list(scope: AdvisorScope | null, filters: CrmClientFilters = {}): Promise<CrmClient[]> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return [];

    const search = filters.search?.trim() ?? "";
    const from = filters.from?.trim() ?? "";
    const to = filters.to?.trim() ?? "";
    const searchPattern = search ? `%${search}%` : null;

    const rows = await withDbRetry(() =>
      scope
        ? sql<ClientRow[]>`
            SELECT *
            FROM crm_clients
            WHERE advisor_id = ${scope.id}
              AND (${searchPattern}::text IS NULL OR customer_name ILIKE ${searchPattern} OR rut ILIKE ${searchPattern})
              AND (${from} = '' OR updated_at::date >= ${from}::date)
              AND (${to} = '' OR updated_at::date <= ${to}::date)
            ORDER BY updated_at DESC
          `
        : sql<ClientRow[]>`
            SELECT *
            FROM crm_clients
            WHERE (${searchPattern}::text IS NULL OR customer_name ILIKE ${searchPattern} OR rut ILIKE ${searchPattern})
              AND (${from} = '' OR updated_at::date >= ${from}::date)
              AND (${to} = '' OR updated_at::date <= ${to}::date)
            ORDER BY updated_at DESC
          `,
    );

    return rows.map(rowToClient);
  }
}

class MockCrmClientsRepository implements CrmClientsRepository {
  private store: CrmClient[] = [];

  async upsert(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: LeadType;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }): Promise<void> {
    const id = `CRM-${input.conversationId}-${input.advisorId}`;
    const idx = this.store.findIndex((c) => c.id === id);
    const now = new Date().toISOString();
    const row: CrmClient = {
      id,
      conversationId: input.conversationId,
      customerName: input.customerName,
      rut: input.rut,
      phone: input.phone,
      gestionType: input.gestionType,
      advisorId: input.advisorId,
      advisorName: input.advisorName,
      hasSale: input.hasSale || (idx >= 0 && this.store[idx].hasSale),
      updatedDate: now.slice(0, 10),
      updatedAt: now,
    };
    if (idx >= 0) this.store[idx] = row;
    else this.store.unshift(row);
  }

  list(scope: AdvisorScope | null, filters: CrmClientFilters = {}): Promise<CrmClient[]> {
    let rows = [...this.store];
    if (scope) rows = rows.filter((c) => c.advisorId === scope.id);
    const q = filters.search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (c) => c.customerName.toLowerCase().includes(q) || c.rut.toLowerCase().includes(q),
      );
    }
    if (filters.from) rows = rows.filter((c) => c.updatedDate >= filters.from!);
    if (filters.to) rows = rows.filter((c) => c.updatedDate <= filters.to!);
    return Promise.resolve(rows);
  }
}

let repo: CrmClientsRepository | null = null;

export function getCrmClientsRepository(): CrmClientsRepository {
  if (!repo) {
    repo = hasDatabase() ? new PostgresCrmClientsRepository() : new MockCrmClientsRepository();
  }
  return repo;
}

export { LEAD_TYPE_LABELS };
