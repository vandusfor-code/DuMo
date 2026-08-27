import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import type { LeadType } from "@/types/lead";
import type { CrmClient, CrmClientFilters } from "@/types/crm-client";
import { LEAD_TYPE_LABELS } from "@/types/lead";
import { getConversationRepository } from "@/repositories/conversation.repository";
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
    gestionType: row.gestion_type as string,
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
    gestionType: string;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }): Promise<void>;
  syncFromGestiones(scope: AdvisorScope): Promise<void>;
  list(scope: AdvisorScope | null, filters?: CrmClientFilters): Promise<CrmClient[]>;
}

class PostgresCrmClientsRepository implements CrmClientsRepository {
  /** Si el id guardado quedó obsoleto (p. ej. tras fusionar chats), resolver por teléfono. */
  private async resolveConversationId(storedId: string, phone: string): Promise<string> {
    const sql = getSql();
    if (!sql) return storedId;
    const exists = (await sql`
      SELECT id FROM lead_conversations WHERE id = ${storedId} LIMIT 1
    `) as { id: string }[];
    if (exists[0]?.id) return storedId;
    const digits = phone.replace(/\D/g, "");
    if (!digits) return storedId;
    const found = await getConversationRepository().findWebQrConversationId(digits);
    return found ?? storedId;
  }

  async upsert(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: string;
    advisorId: string;
    advisorName: string;
    hasSale: boolean;
  }): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) throw new Error("Base de datos no configurada");

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

  async syncFromGestiones(scope: AdvisorScope): Promise<void> {
    await ensureSchema();
    const sql = getSql();
    if (!sql) return;

    await withDbRetry(() =>
      sql`
        INSERT INTO crm_clients (
          id, conversation_id, customer_name, rut, phone, gestion_type,
          advisor_id, advisor_name, has_sale, updated_at, created_at
        )
        SELECT
          'CRM-' || g.conversation_id || '-' || ${scope.id},
          g.conversation_id,
          g.customer_name,
          g.rut,
          g.phone,
          g.gestion_type,
          ${scope.id},
          ${scope.name},
          false,
          g.created_at,
          g.created_at
        FROM (
          SELECT DISTINCT ON (g.conversation_id)
            g.conversation_id,
            g.customer_name,
            g.rut,
            g.phone,
            g.gestion_type,
            g.created_at
          FROM lead_gestiones g
          LEFT JOIN lead_conversations c ON c.id = g.conversation_id
          WHERE g.advisor_id = ${scope.id}
             OR g.advisor_name = ${scope.name}
             OR (
               (g.advisor_id IS NULL OR g.advisor_id = '')
               AND c.assigned_advisor_id = ${scope.id}
             )
          ORDER BY g.conversation_id, g.created_at DESC
        ) g
        ON CONFLICT (conversation_id, advisor_id) DO UPDATE SET
          customer_name = EXCLUDED.customer_name,
          rut = EXCLUDED.rut,
          phone = EXCLUDED.phone,
          gestion_type = EXCLUDED.gestion_type,
          advisor_name = EXCLUDED.advisor_name,
          has_sale = crm_clients.has_sale OR EXCLUDED.has_sale,
          updated_at = GREATEST(crm_clients.updated_at, EXCLUDED.updated_at)
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
    const searchLike = search ? `%${search}%` : null;

    const rows = await withDbRetry(() => {
      if (scope && searchLike && from && to) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND (customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike})
            AND updated_at::date >= ${from}::date
            AND updated_at::date <= ${to}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope && searchLike && from) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND (customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike})
            AND updated_at::date >= ${from}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope && searchLike && to) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND (customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike})
            AND updated_at::date <= ${to}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope && searchLike) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND (customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike})
          ORDER BY updated_at DESC
        `;
      }
      if (scope && from && to) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND updated_at::date >= ${from}::date
            AND updated_at::date <= ${to}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope && from) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND updated_at::date >= ${from}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope && to) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
            AND updated_at::date <= ${to}::date
          ORDER BY updated_at DESC
        `;
      }
      if (scope) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE advisor_id = ${scope.id}
          ORDER BY updated_at DESC
        `;
      }
      if (searchLike && from && to) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE (customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike})
            AND updated_at::date >= ${from}::date
            AND updated_at::date <= ${to}::date
          ORDER BY updated_at DESC
        `;
      }
      if (searchLike) {
        return sql<ClientRow[]>`
          SELECT * FROM crm_clients
          WHERE customer_name ILIKE ${searchLike} OR rut ILIKE ${searchLike}
          ORDER BY updated_at DESC
        `;
      }
      return sql<ClientRow[]>`
        SELECT * FROM crm_clients
        ORDER BY updated_at DESC
      `;
    });

    const resolved = await Promise.all(
      rows.map(async (row) => {
        const conversationId = await this.resolveConversationId(row.conversation_id, row.phone);
        return rowToClient({ ...row, conversation_id: conversationId });
      }),
    );
    return resolved;
  }
}

class MockCrmClientsRepository implements CrmClientsRepository {
  private store: CrmClient[] = [];

  async upsert(input: {
    conversationId: string;
    customerName: string;
    rut: string;
    phone: string;
    gestionType: string;
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

  async syncFromGestiones(_scope: AdvisorScope): Promise<void> {
    /* mock: no-op */
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
