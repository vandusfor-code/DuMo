import "server-only";
import {
  buildPendientesSummary,
  mapPendientesListRow,
  matchesPendientesDateRange,
  matchesPendientesSearch,
  type PendientesListRow,
} from "@/lib/pendientes-list-utils";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import type {
  AdvisorRecuperacionFilters,
  AdvisorRecuperacionResult,
} from "@/types/advisor-recuperacion";

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

async function fetchRecuperacionRows(advisorId: string): Promise<PendientesListRow[]> {
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
      WHERE f.module = 'recuperacion'
        AND f.status <> 'completed'
        AND f.owner_advisor_id = ${advisorId}
      ORDER BY f.follow_up_date ASC, f.created_at ASC
    `,
  );
}

export async function listAdvisorRecuperacion(
  advisorId: string,
  filters: AdvisorRecuperacionFilters,
): Promise<AdvisorRecuperacionResult> {
  const allRows = await fetchRecuperacionRows(advisorId);
  const filtered = allRows.filter((row) => {
    if (filters.type !== "all" && row.tipification_slug !== filters.type) return false;
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
