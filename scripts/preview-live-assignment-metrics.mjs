#!/usr/bin/env node
/** Muestra métricas Live de asignación en BD (prod/staging). */
import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const url =
  process.env.DATABASE_URL1?.trim() ??
  loadRailwayTestDatabaseUrl() ??
  null;
if (!url) {
  console.error("DATABASE_URL1 requerido");
  process.exit(1);
}

const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
const sql = postgres(url, { max: 1, prepare: false });

try {
  await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_at timestamptz`;

  const assignedNow = await sql`
    SELECT count(*)::int AS n FROM lead_conversations WHERE assigned_advisor_id IS NOT NULL
  `;

  const byAdvisor = await sql`
    SELECT
      u.name,
      count(c.id) FILTER (WHERE c.assigned_advisor_id IS NOT NULL)::int AS assigned_now,
      count(c.id) FILTER (
        WHERE c.assigned_advisor_at IS NOT NULL
          AND to_char(c.assigned_advisor_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${today}
      )::int AS assigned_today,
      (
        SELECT count(*)::int FROM lead_gestiones g
        WHERE g.advisor_id = u.id
          AND to_char(g.created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${today}
      ) AS gestiones_today
    FROM users u
    LEFT JOIN lead_conversations c ON c.assigned_advisor_id = u.id
    WHERE u.role = 'asesora' AND u.active = true
    GROUP BY u.id, u.name
    ORDER BY assigned_now DESC
    LIMIT 8
  `;

  console.log(
    JSON.stringify(
      {
        today,
        leadsAssignedNow: assignedNow[0]?.n ?? 0,
        advisors: byAdvisor,
        note: "assigned_today será 0 en filas previas al deploy hasta nuevas asignaciones",
      },
      null,
      2,
    ),
  );
} finally {
  await sql.end({ timeout: 5 });
}
