import "server-only";
import {
  buildPendientesSummary,
  mapPendientesListRow,
  matchesPendientesDateRange,
  matchesPendientesSearch,
  type PendientesListRow,
} from "@/lib/pendientes-list-utils";
import {
  ADVISOR_PRESENCE_LABELS,
  advisorReceivesLeads,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { getAuthRepository } from "@/repositories/auth.repository";
import { reopenConversationToAdvisor } from "@/services/inbox-reopen.service";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type { AdminPendientesFilters, AdminPendientesResult } from "@/types/admin-pendientes";

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

async function fetchPendingRows(): Promise<PendientesListRow[]> {
  await ensureSchema();
  const sql = requireSql();
  return withDbRetry(() =>
    sql<PendientesListRow[]>`
      SELECT
        f.id,
        f.conversation_id,
        f.gestion_id,
        f.customer_name,
        f.phone,
        f.tipification_slug,
        t.name AS tipification_name,
        t.badge_bg,
        t.badge_text,
        f.follow_up_date::text AS follow_up_date,
        f.origin_advisor_id,
        u.name AS origin_advisor_name,
        f.advisor_name,
        g.notes AS note
      FROM lead_follow_ups f
      LEFT JOIN tipifications t
        ON t.slug = f.tipification_slug AND t.company_id = ${DEFAULT_COMPANY_ID}
      LEFT JOIN users u ON u.id = f.origin_advisor_id
      LEFT JOIN lead_gestiones g ON g.id = f.gestion_id
      WHERE f.status = 'pending'
        AND f.module = 'pendientes'
      ORDER BY f.follow_up_date ASC, f.created_at ASC
    `,
  );
}

export async function listAdminPendientes(
  filters: AdminPendientesFilters,
): Promise<AdminPendientesResult> {
  const allRows = await fetchPendingRows();
  const filtered = allRows.filter((row) => {
    if (filters.type !== "all" && row.tipification_slug !== filters.type) return false;
    if (filters.advisor !== "all") {
      const advisorId = row.origin_advisor_id;
      if (advisorId !== filters.advisor) return false;
    }
    if (!matchesPendientesDateRange(row.follow_up_date, filters.dateRange)) return false;
    if (!matchesPendientesSearch(row, filters.search)) return false;
    return true;
  });

  const mappedAll = filtered.map(mapPendientesListRow);
  const summary = buildPendientesSummary(mappedAll);
  const start = (filters.page - 1) * filters.pageSize;
  const pageRows = mappedAll.slice(start, start + filters.pageSize);

  return {
    rows: pageRows,
    total: mappedAll.length,
    summary,
  };
}

export async function transferPendienteToAdvisor(input: {
  pendienteId: string;
  advisorId: string;
}): Promise<void> {
  await ensureSchema();
  const sql = requireSql();
  const advisor = await getAuthRepository().findById(input.advisorId);
  if (!advisor || advisor.role !== "asesora") {
    throw new Error("Asesora no encontrada.");
  }

  const presenceRows = await sql<{ presence_status: string }[]>`
    SELECT presence_status FROM users WHERE id = ${advisor.id} LIMIT 1
  `;
  const presence = (presenceRows[0]?.presence_status ?? "disponible") as AdvisorPresenceStatus;
  if (!advisorReceivesLeads(presence)) {
    const label = ADVISOR_PRESENCE_LABELS[presence] ?? presence;
    throw new Error(`La asesora está en estado "${label}" y no puede recibir transferencias.`);
  }

  const rows = await sql<
    { id: string; conversation_id: string; status: string; module: string }[]
  >`
    SELECT id, conversation_id, status, module
    FROM lead_follow_ups
    WHERE id = ${input.pendienteId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) throw new Error("Pendiente no encontrado.");
  if (row.status !== "pending" || row.module !== "pendientes") {
    throw new Error("Este pendiente ya fue transferido o cerrado.");
  }

  await reopenConversationToAdvisor(row.conversation_id, {
    id: advisor.id,
    name: advisor.name,
  });

  await withDbRetry(() =>
    sql`
      UPDATE lead_follow_ups
      SET status = 'transferred',
          module = 'recuperacion',
          owner_advisor_id = ${advisor.id},
          completed_at = NULL
      WHERE id = ${input.pendienteId}
    `,
  );

  const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
  emitLeadsConversationUpdated({
    conversationId: row.conversation_id,
    assignedAdvisorId: advisor.id,
    reason: "assign",
  });
}
