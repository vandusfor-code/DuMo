import "server-only";
import {
  ADVISOR_ONLINE_WINDOW_MINUTES,
  effectiveAdvisorPresenceStatus,
  type AdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import { businessDateISO, previousBusinessDateISO } from "@/lib/date";
import type { LiveSnapshot } from "@/types/admin-live";
import { ensureSchema, getSql, withDbRetry, withQueryTimeout } from "@/server/db/client";

export interface AdvisorPresenceRepository {
  getLiveSnapshot(selectedDate?: string): Promise<LiveSnapshot>;
  setPresence(
    advisorId: string,
    status: AdvisorPresenceStatus,
    updatedBy: string,
    options?: { revokeSessionOnDisconnect?: boolean },
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
  async getLiveSnapshot(selectedDate?: string): Promise<LiveSnapshot> {
    await ensureSchema();
    const sql = requireSql();
    const dayIso = selectedDate?.trim() || businessDateISO();
    const todayIso = businessDateISO();
    const isToday = dayIso === todayIso;
    const previousIso = previousBusinessDateISO(dayIso);

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
        WITH gestiones_day AS (
          SELECT advisor_id, count(*)::int AS n
          FROM lead_gestiones
          WHERE advisor_id IS NOT NULL
            AND to_char(created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${dayIso}
          GROUP BY advisor_id
        ),
        assigned_day AS (
          SELECT c.assigned_advisor_id AS advisor_id, count(*)::int AS n
          FROM lead_conversations c
          WHERE c.assigned_advisor_id IS NOT NULL
            AND to_char(
              coalesce(
                c.assigned_advisor_at,
                (
                  SELECT min(m.created_at)
                  FROM lead_messages m
                  WHERE m.conversation_id = c.id AND m.direction = 'in'
                )
              ) AT TIME ZONE 'America/Santiago',
              'YYYY-MM-DD'
            ) = ${dayIso}
          GROUP BY c.assigned_advisor_id
        ),
        sales_day AS (
          SELECT advisor_id, count(*)::int AS n
          FROM sales
          WHERE advisor_id IS NOT NULL
            AND sale_date = ${dayIso}::date
          GROUP BY advisor_id
        )
        SELECT
          u.id,
          u.name,
          u.avatar_url,
          u.presence_status,
          (
            ${isToday}
            AND u.last_seen_at IS NOT NULL
            AND u.last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
            AND u.presence_status <> 'desconectado'
          ) AS is_online,
          coalesce(g.n, 0)::int AS gestiones_today,
          coalesce(at.n, 0)::int AS assigned_today,
          coalesce(s.n, 0)::int AS sales_today
        FROM users u
        LEFT JOIN gestiones_day g ON g.advisor_id = u.id
        LEFT JOIN assigned_day at ON at.advisor_id = u.id
        LEFT JOIN sales_day s ON s.advisor_id = u.id
        WHERE u.role = 'asesora' AND u.active = true
        ORDER BY is_online DESC, u.name ASC
      `,
      8_000,
    );

    const totals = await withQueryTimeout(
      sql<
        {
          gestiones_previous: number;
          sales_previous: number;
          team_gestiones_day: number;
          team_sales_day: number;
          leads_assigned_now: number;
          active_advisors_day: number;
        }[]
      >`
        WITH gestiones_day AS (
          SELECT count(*)::int AS n
          FROM lead_gestiones g
          JOIN users u ON u.id = g.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${dayIso}
        ),
        gestiones_previous AS (
          SELECT count(*)::int AS n
          FROM lead_gestiones g
          JOIN users u ON u.id = g.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${previousIso}
        ),
        sales_day AS (
          SELECT count(*)::int AS n
          FROM sales s
          JOIN users u ON u.id = s.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND s.sale_date = ${dayIso}::date
        ),
        sales_previous AS (
          SELECT count(*)::int AS n
          FROM sales s
          JOIN users u ON u.id = s.advisor_id
          WHERE u.role = 'asesora' AND u.active = true
            AND s.sale_date = ${previousIso}::date
        ),
        active_advisors_day AS (
          SELECT count(DISTINCT u.id)::int AS n
          FROM users u
          WHERE u.role = 'asesora' AND u.active = true
            AND (
              EXISTS (
                SELECT 1 FROM lead_gestiones g
                WHERE g.advisor_id = u.id
                  AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${dayIso}
              )
              OR EXISTS (
                SELECT 1 FROM lead_conversations c
                WHERE c.assigned_advisor_id = u.id
                  AND to_char(
                    coalesce(
                      c.assigned_advisor_at,
                      (
                        SELECT min(m.created_at)
                        FROM lead_messages m
                        WHERE m.conversation_id = c.id AND m.direction = 'in'
                      )
                    ) AT TIME ZONE 'America/Santiago',
                    'YYYY-MM-DD'
                  ) = ${dayIso}
              )
            )
        )
        SELECT
          (SELECT n FROM gestiones_previous) AS gestiones_previous,
          (SELECT n FROM sales_previous) AS sales_previous,
          (SELECT n FROM gestiones_day) AS team_gestiones_day,
          (SELECT n FROM sales_day) AS team_sales_day,
          (
            SELECT count(*)::int
            FROM lead_conversations
            WHERE assigned_advisor_id IS NOT NULL
          ) AS leads_assigned_now,
          (SELECT n FROM active_advisors_day) AS active_advisors_day
      `,
      8_000,
    );

    const team = totals[0] ?? {
      gestiones_previous: 0,
      sales_previous: 0,
      team_gestiones_day: 0,
      team_sales_day: 0,
      leads_assigned_now: 0,
      active_advisors_day: 0,
    };

    const advisors = rows.map((row) => {
      const isOnline = row.is_online;
      const stored = row.presence_status as AdvisorPresenceStatus;
      return {
        id: row.id,
        name: row.name,
        avatarUrl: row.avatar_url ?? "",
        isOnline,
        presenceStatus: effectiveAdvisorPresenceStatus(isOnline, stored),
        leadsAssignedToday: row.assigned_today,
        leadsManagedToday: row.gestiones_today,
        connectionTimeLabel: null,
        connectionProgressPct: null,
      };
    });

    const connectedAdvisors = isToday
      ? advisors.filter((a) => a.isOnline).length
      : team.active_advisors_day;

    const teamProductivityPct = productivityPct(
      team.team_sales_day,
      team.team_gestiones_day,
    );
    const teamProductivityPrevious = productivityPct(
      team.sales_previous,
      team.gestiones_previous,
    );

    return {
      summary: {
        connectedAdvisors,
        leadsManagedToday: team.team_gestiones_day,
        leadsAssignedNow: team.leads_assigned_now,
        avgConnectionTimeLabel: null,
        teamProductivityPct,
        teamProductivityDeltaPct: teamProductivityPct - teamProductivityPrevious,
      },
      advisors,
      updatedAt: new Date().toISOString(),
      selectedDate: dayIso,
    };
  }

  async setPresence(
    advisorId: string,
    status: AdvisorPresenceStatus,
    updatedBy: string,
    options?: { revokeSessionOnDisconnect?: boolean },
  ): Promise<{
    presenceStatus: AdvisorPresenceStatus;
    updatedAt: string;
    tokenVersion: number;
    sessionRevoked: boolean;
  }> {
    await ensureSchema();
    const sql = requireSql();
    // Por defecto (panel Live del admin forzando a otra asesora) SÍ revoca
    // la sesión — es la forma de "desconectar" a alguien de verdad. Cuando
    // la propia asesora se marca "Desconectado" desde su selector, NO debe
    // cerrarle la sesión — solo deja de recibir leads nuevos, sigue
    // trabajando sus chats ya asignados.
    const revokeOnDisconnect = options?.revokeSessionOnDisconnect ?? true;
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
              WHEN ${status} = 'desconectado' AND ${revokeOnDisconnect} THEN token_version + 1
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
      sessionRevoked: status === "desconectado" && revokeOnDisconnect,
    };
  }
}

let singleton: AdvisorPresenceRepository | null = null;

export function getAdvisorPresenceRepository(): AdvisorPresenceRepository {
  if (!singleton) singleton = new PostgresAdvisorPresenceRepository();
  return singleton;
}
