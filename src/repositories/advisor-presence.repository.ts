import "server-only";
import {
  ADVISOR_ONLINE_WINDOW_MINUTES,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { businessDateISO } from "@/lib/date";
import type { LiveSnapshot } from "@/types/admin-live";
import { ensureSchema, getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";

export interface AdvisorPresenceRepository {
  getLiveSnapshot(): Promise<LiveSnapshot>;
  setPresence(
    advisorId: string,
    status: AdvisorPresenceStatus,
    updatedBy: string,
  ): Promise<{
    presenceStatus: AdvisorPresenceStatus;
    updatedAt: string;
    tokenVersion: number;
    sessionRevoked: boolean;
  }>;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

function productivityPct(sales: number, gestiones: number): number {
  if (gestiones <= 0) return 0;
  return Math.round((sales / gestiones) * 100);
}

class PostgresAdvisorPresenceRepository implements AdvisorPresenceRepository {
  async getLiveSnapshot(): Promise<LiveSnapshot> {
    await ensureSchema();
    const sql = requireSql();
    const todayIso = businessDateISO();
    const yesterdayIso = businessDateISO(new Date(Date.now() - 86_400_000));

    const rows = await withQueryTimeout(
      sql<
        {
          id: string;
          name: string;
          avatar_url: string;
          presence_status: string;
          is_online: boolean;
          gestiones_today: number;
          assigned_today: number;
          sales_today: number;
        }[]
      >`
        WITH gestiones_today AS (
          SELECT advisor_id, count(*)::int AS n
          FROM lead_gestiones
          WHERE advisor_id IS NOT NULL
            AND to_char(created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${todayIso}
          GROUP BY advisor_id
        ),
        assigned_today AS (
          SELECT assigned_advisor_id AS advisor_id, count(*)::int AS n
          FROM lead_conversations
          WHERE assigned_advisor_id IS NOT NULL
            AND assigned_advisor_at IS NOT NULL
            AND to_char(assigned_advisor_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${todayIso}
          GROUP BY assigned_advisor_id
        ),
        sales_today AS (
          SELECT advisor_id, count(*)::int AS n
          FROM sales
          WHERE advisor_id IS NOT NULL
            AND sale_date = ${todayIso}::date
          GROUP BY advisor_id
        )
        SELECT
          u.id,
          u.name,
          u.avatar_url,
          u.presence_status,
          (
            u.last_seen_at IS NOT NULL
            AND u.last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
            AND u.presence_status <> 'desconectado'
          ) AS is_online,
          coalesce(g.n, 0)::int AS gestiones_today,
          coalesce(at.n, 0)::int AS assigned_today,
          coalesce(s.n, 0)::int AS sales_today
        FROM users u
        LEFT JOIN gestiones_today g ON g.advisor_id = u.id
        LEFT JOIN assigned_today at ON at.advisor_id = u.id
        LEFT JOIN sales_today s ON s.advisor_id = u.id
        WHERE u.role = 'asesora' AND u.active = true
        ORDER BY is_online DESC, u.name ASC
      `,
      8_000,
    );

    const totals = await withQueryTimeout(
      sql<
        {
          gestiones_yesterday: number;
          sales_yesterday: number;
          team_gestiones_today: number;
          team_sales_today: number;
          leads_assigned_now: number;
        }[]
      >`
        WITH gestiones_today AS (
          SELECT count(*)::int AS n
          FROM lead_gestiones g
          JOIN users u ON u.id = g.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${todayIso}
        ),
        gestiones_yesterday AS (
          SELECT count(*)::int AS n
          FROM lead_gestiones g
          JOIN users u ON u.id = g.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${yesterdayIso}
        ),
        sales_today AS (
          SELECT count(*)::int AS n
          FROM sales s
          JOIN users u ON u.id = s.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND s.sale_date = ${todayIso}::date
        ),
        sales_yesterday AS (
          SELECT count(*)::int AS n
          FROM sales s
          JOIN users u ON u.id = s.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND s.sale_date = ${yesterdayIso}::date
        )
        SELECT
          (SELECT n FROM gestiones_yesterday) AS gestiones_yesterday,
          (SELECT n FROM sales_yesterday) AS sales_yesterday,
          (SELECT n FROM gestiones_today) AS team_gestiones_today,
          (SELECT n FROM sales_today) AS team_sales_today,
          (
            SELECT count(*)::int
            FROM lead_conversations
            WHERE assigned_advisor_id IS NOT NULL
          ) AS leads_assigned_now
      `,
      8_000,
    );

    const team = totals[0] ?? {
      gestiones_yesterday: 0,
      sales_yesterday: 0,
      team_gestiones_today: 0,
      team_sales_today: 0,
      leads_assigned_now: 0,
    };

    const advisors = rows.map((row) => ({
      id: row.id,
      name: row.name,
      avatarUrl: row.avatar_url ?? "",
      isOnline: row.is_online,
      presenceStatus: row.presence_status as AdvisorPresenceStatus,
      leadsAssignedToday: row.assigned_today,
      leadsManagedToday: row.gestiones_today,
      connectionTimeLabel: null,
      connectionProgressPct: null,
    }));

    const connectedAdvisors = advisors.filter((a) => a.isOnline).length;
    const teamProductivityPct = productivityPct(
      team.team_sales_today,
      team.team_gestiones_today,
    );
    const teamProductivityYesterday = productivityPct(
      team.sales_yesterday,
      team.gestiones_yesterday,
    );

    return {
      summary: {
        connectedAdvisors,
        leadsManagedToday: team.team_gestiones_today,
        leadsAssignedNow: team.leads_assigned_now,
        avgConnectionTimeLabel: null,
        teamProductivityPct,
        teamProductivityDeltaPct: teamProductivityPct - teamProductivityYesterday,
      },
      advisors,
      updatedAt: new Date().toISOString(),
    };
  }

  async setPresence(
    advisorId: string,
    status: AdvisorPresenceStatus,
    updatedBy: string,
  ): Promise<{
    presenceStatus: AdvisorPresenceStatus;
    updatedAt: string;
    tokenVersion: number;
    sessionRevoked: boolean;
  }> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await withDbRetry(() =>
      sql<
        {
          presence_status: AdvisorPresenceStatus;
          presence_updated_at: Date;
          token_version: number;
        }[]
      >`
        UPDATE users
        SET presence_status = ${status},
            presence_updated_at = now(),
            presence_updated_by = ${updatedBy},
            token_version = CASE
              WHEN ${status} = 'desconectado' THEN token_version + 1
              ELSE token_version
            END
        WHERE id = ${advisorId}
        RETURNING presence_status, presence_updated_at, token_version
      `,
    );
    const row = rows[0];
    if (!row) throw new Error("Asesora no encontrada.");
    return {
      presenceStatus: row.presence_status,
      updatedAt:
        row.presence_updated_at instanceof Date
          ? row.presence_updated_at.toISOString()
          : new Date(String(row.presence_updated_at)).toISOString(),
      tokenVersion: Number(row.token_version ?? 0),
      sessionRevoked: status === "desconectado",
    };
  }
}

let singleton: AdvisorPresenceRepository | null = null;

export function getAdvisorPresenceRepository(): AdvisorPresenceRepository {
  if (!singleton) singleton = new PostgresAdvisorPresenceRepository();
  return singleton;
}
