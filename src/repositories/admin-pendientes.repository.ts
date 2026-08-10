import "server-only";
import {
  computePendienteDisplayStatus,
  formatFollowUpDateLabel,
  isFollowUpOverdue,
  PENDIENTES_SUMMARY_GROUPS,
} from "@/lib/pendientes-display";
import {
  ADVISOR_PRESENCE_LABELS,
  advisorReceivesLeads,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { getAuthRepository } from "@/repositories/auth.repository";
import { reopenConversationToAdvisor } from "@/services/inbox-reopen.service";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type {
  AdminPendienteRow,
  AdminPendientesDateRange,
  AdminPendientesFilters,
  AdminPendientesResult,
  AdminPendientesSummary,
} from "@/types/admin-pendientes";

type FollowUpListRow = {
  id: string;
  conversation_id: string;
  gestion_id: string;
  customer_name: string;
  phone: string;
  tipification_slug: string;
  tipification_name: string | null;
  badge_bg: string | null;
  badge_text: string | null;
  follow_up_date: string;
  origin_advisor_id: string | null;
  origin_advisor_name: string | null;
  advisor_name: string;
  note: string | null;
};

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

function mapRow(row: FollowUpListRow): AdminPendienteRow {
  const followUpDate = row.follow_up_date.slice(0, 10);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    gestionId: row.gestion_id,
    customerName: row.customer_name,
    phone: row.phone,
    tipificationSlug: row.tipification_slug,
    tipificationName: row.tipification_name ?? row.tipification_slug,
    tipificationBadgeBg: row.badge_bg ?? "#eef2ff",
    tipificationBadgeText: row.badge_text ?? "#3730a3",
    followUpDate,
    followUpDateLabel: formatFollowUpDateLabel(followUpDate),
    originAdvisorId: row.origin_advisor_id,
    originAdvisorName: row.origin_advisor_name ?? row.advisor_name ?? "",
    note: row.note?.trim() ?? "",
    isOverdue: isFollowUpOverdue(followUpDate),
    displayStatus: computePendienteDisplayStatus(followUpDate),
  };
}

function matchesSearch(row: FollowUpListRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.customer_name.toLowerCase().includes(q) ||
    row.phone.toLowerCase().includes(q) ||
    (row.note ?? "").toLowerCase().includes(q)
  );
}

function matchesDateRange(followUpDate: string, range: AdminPendientesDateRange): boolean {
  if (range === "all") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${followUpDate.slice(0, 10)}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (range === "today") return diffDays === 0;
  if (range === "next7") return diffDays >= 0 && diffDays <= 7;
  if (range === "next30") return diffDays >= 0 && diffDays <= 30;
  return true;
}

function buildSummary(rows: AdminPendienteRow[]): AdminPendientesSummary {
  const bySlug = new Map<string, { slug: string; name: string; count: number }>();
  for (const row of rows) {
    const existing = bySlug.get(row.tipificationSlug);
    if (existing) {
      existing.count += 1;
    } else {
      bySlug.set(row.tipificationSlug, {
        slug: row.tipificationSlug,
        name: row.tipificationName,
        count: 1,
      });
    }
  }

  const countGroup = (slugs: readonly string[]) =>
    rows.filter((r) => slugs.includes(r.tipificationSlug)).length;

  return {
    totalPending: rows.length,
    deuda: countGroup(PENDIENTES_SUMMARY_GROUPS.deuda),
    permanencia: countGroup(PENDIENTES_SUMMARY_GROUPS.permanencia),
    seguimiento: countGroup(PENDIENTES_SUMMARY_GROUPS.seguimiento),
    byType: [...bySlug.values()].sort((a, b) => b.count - a.count),
  };
}

async function fetchPendingRows(): Promise<FollowUpListRow[]> {
  await ensureSchema();
  const sql = requireSql();
  return withDbRetry(() =>
    sql<FollowUpListRow[]>`
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
    if (!matchesDateRange(row.follow_up_date, filters.dateRange)) return false;
    if (!matchesSearch(row, filters.search)) return false;
    return true;
  });

  const mappedAll = filtered.map(mapRow);
  const summary = buildSummary(mappedAll);
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
          completed_at = now()
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
