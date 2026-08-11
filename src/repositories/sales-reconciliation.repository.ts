import "server-only";
import { ensureSchema, getSql, hasDatabase, withDbRetry, withQueryTimeout } from "@/server/db/client";
import type { OrphanSaleGestion, ReconciliationStatus } from "@/types/sales-reconciliation";

export interface SalesReconciliationRepository {
  /** Gestiones "venta" sin ninguna venta del mismo teléfono+asesora, y sin veredicto previo. */
  listOrphanGestiones(): Promise<OrphanSaleGestion[]>;
  markResolved(input: {
    gestionId: string;
    status: ReconciliationStatus;
    resolvedSaleId?: string | null;
    resolvedBy: string;
  }): Promise<void>;
}

type GestionRow = {
  id: string;
  conversation_id: string;
  phone: string;
  customer_name: string;
  rut: string;
  advisor_id: string | null;
  advisor_name: string;
  lines: unknown;
  created_at: string;
};

/**
 * postgres.js no auto-parsea esta columna jsonb en esta configuración —
 * llega como texto crudo, no como array ya parseado (el mismo patrón
 * Array.isArray-sin-JSON.parse ya existe en postgres-leads.repository.ts:164,
 * donde causa el mismo problema silencioso al restaurar borradores).
 */
function parseLines(value: unknown): OrphanSaleGestion["lines"] {
  if (Array.isArray(value)) return value as OrphanSaleGestion["lines"];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapRow(r: GestionRow): OrphanSaleGestion {
  const lines = parseLines(r.lines);
  return {
    gestionId: r.id,
    conversationId: r.conversation_id,
    phone: r.phone,
    customerName: r.customer_name,
    rut: r.rut,
    advisorId: r.advisor_id ?? "",
    advisorName: r.advisor_name,
    lines: lines as OrphanSaleGestion["lines"],
    createdAt: new Date(r.created_at).toISOString(),
  };
}

class MockSalesReconciliationRepository implements SalesReconciliationRepository {
  async listOrphanGestiones() {
    return [];
  }
  async markResolved() {
    /* no-op sin base de datos */
  }
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

class PostgresSalesReconciliationRepository implements SalesReconciliationRepository {
  async listOrphanGestiones(): Promise<OrphanSaleGestion[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withQueryTimeout(
      withDbRetry(() =>
        sql<GestionRow[]>`
          SELECT g.id, g.conversation_id, g.phone, g.customer_name, g.rut,
                 g.advisor_id, g.advisor_name, g.lines, g.created_at
          FROM lead_gestiones g
          LEFT JOIN gestion_reconciliation gr ON gr.gestion_id = g.id
          WHERE g.gestion_type = 'venta'
            AND gr.gestion_id IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM sales s
              WHERE s.phone = g.phone AND s.advisor_id = g.advisor_id
            )
          ORDER BY g.created_at DESC
        `,
      ),
      8000,
    );
    return rows.map(mapRow);
  }

  async markResolved(input: {
    gestionId: string;
    status: ReconciliationStatus;
    resolvedSaleId?: string | null;
    resolvedBy: string;
  }): Promise<void> {
    await ensureSchema();
    const sql = requireSql();
    await sql`
      INSERT INTO gestion_reconciliation (gestion_id, status, resolved_sale_id, resolved_by)
      VALUES (${input.gestionId}, ${input.status}, ${input.resolvedSaleId ?? null}, ${input.resolvedBy})
      ON CONFLICT (gestion_id) DO UPDATE SET
        status = EXCLUDED.status,
        resolved_sale_id = EXCLUDED.resolved_sale_id,
        resolved_by = EXCLUDED.resolved_by,
        resolved_at = now()
    `;
  }
}

export function getSalesReconciliationRepository(): SalesReconciliationRepository {
  return hasDatabase()
    ? new PostgresSalesReconciliationRepository()
    : new MockSalesReconciliationRepository();
}
