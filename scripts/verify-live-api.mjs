#!/usr/bin/env node
/**
 * Verifica etapa 2 del módulo Live (snapshot + PATCH presencia) en Railway.
 * Uso:
 *   node --env-file=.env.railway.postgres.local scripts/verify-live-api.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const url =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  loadRailwayTestDatabaseUrl();

if (!url) {
  console.error("No hay DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

function businessDateISO(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function productivityPct(sales, gestiones) {
  if (gestiones <= 0) return 0;
  return Math.round((sales / gestiones) * 100);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

try {
  const todayIso = businessDateISO();
  const yesterdayIso = businessDateISO(new Date(Date.now() - 86_400_000));

  console.log("1) Snapshot SQL (equivalente GET /api/admin/live/snapshot)…");

  const advisors = await sql`
    WITH gestiones_today AS (
      SELECT advisor_id, count(*)::int AS n
      FROM lead_gestiones
      WHERE advisor_id IS NOT NULL
        AND to_char(created_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${todayIso}
      GROUP BY advisor_id
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
      u.presence_status,
      (
        u.last_seen_at IS NOT NULL
        AND u.last_seen_at > now() - interval '10 minutes'
        AND u.presence_status <> 'desconectado'
      ) AS is_online,
      coalesce(g.n, 0)::int AS gestiones_today,
      coalesce(s.n, 0)::int AS sales_today
    FROM users u
    LEFT JOIN gestiones_today g ON g.advisor_id = u.id
    LEFT JOIN sales_today s ON s.advisor_id = u.id
    WHERE u.role = 'asesora' AND u.active = true
    ORDER BY is_online DESC, u.name ASC
  `;

  const totals = await sql`
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
      (SELECT n FROM sales_today) AS team_sales_today
  `;

  const team = totals[0];
  const connected = advisors.filter((a) => a.is_online).length;
  const prodToday = productivityPct(team.team_sales_today, team.team_gestiones_today);
  const prodYesterday = productivityPct(team.sales_yesterday, team.gestiones_yesterday);

  console.log(`   Asesoras activas: ${advisors.length}`);
  console.log(`   Conectadas (10 min, no desconectado): ${connected}`);
  console.log(`   Gestiones hoy (equipo): ${team.team_gestiones_today}`);
  console.log(`   Ventas hoy (equipo): ${team.team_sales_today}`);
  console.log(`   Productividad: ${prodToday}% (Δ vs ayer: ${prodToday - prodYesterday}pp)`);

  for (const a of advisors.slice(0, 5)) {
    console.log(
      `   · ${a.name}: online=${a.is_online}, status=${a.presence_status}, gestiones=${a.gestiones_today}`,
    );
  }

  const target = advisors[0];
  if (!target) {
    console.log("\nSin asesoras — snapshot OK, PATCH omitido.");
    process.exit(0);
  }

  console.log(`\n2) PATCH presencia → bano (${target.name})…`);
  await sql`
    UPDATE users
    SET presence_status = 'bano',
        presence_updated_at = now(),
        presence_updated_by = 'verify-live-script'
    WHERE id = ${target.id} AND role = 'asesora'
  `;

  const [patched] = await sql`
    SELECT presence_status FROM users WHERE id = ${target.id}
  `;
  assert(patched?.presence_status === "bano", "estado esperado bano");

  console.log("3) PATCH revert → disponible…");
  await sql`
    UPDATE users
    SET presence_status = 'disponible',
        presence_updated_at = now(),
        presence_updated_by = 'verify-live-script'
    WHERE id = ${target.id}
  `;

  const [reverted] = await sql`
    SELECT presence_status, token_version FROM users WHERE id = ${target.id}
  `;
  assert(reverted?.presence_status === "disponible", "debe volver a disponible");
  assert(reverted?.token_version === 0, "token_version no debe cambiar en etapa 2");

  console.log("\nRutas API implementadas (requieren sesión HTTP):");
  console.log("   GET  /api/admin/live/snapshot");
  console.log("   PATCH /api/admin/live/presence  { advisorId, status }");
  console.log("   PATCH /api/advisors/me/presence   { status }  (asesora)");

  console.log("\nOK: etapa 2 verificada en Railway (datos + PATCH presencia, sin token_version).");
} catch (error) {
  console.error("\nFALLÓ:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
