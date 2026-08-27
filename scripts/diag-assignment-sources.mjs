#!/usr/bin/env node
/** Compara fuentes posibles para "leads asignados hoy" por asesora. */
import postgres from "postgres";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadUrl() {
  if (process.env.DATABASE_URL1?.trim()) return process.env.DATABASE_URL1.trim();
  const local = path.join(root, ".env.local");
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^DATABASE_URL1=(.+)$/);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

const today = process.argv[2] ?? new Date().toLocaleDateString("en-CA", { timeZone: "America/Santiago" });
const url = loadUrl();
if (!url) {
  console.error("DATABASE_URL1 required");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });

try {
  const effective = await sql`
    WITH conv AS (
      SELECT
        c.id,
        c.assigned_advisor_id,
        c.assigned_advisor_at,
        (
          SELECT min(m.created_at)
          FROM lead_messages m
          WHERE m.conversation_id = c.id AND m.direction = 'in'
        ) AS first_in
      FROM lead_conversations c
      WHERE c.assigned_advisor_id IS NOT NULL
    )
    SELECT
      u.name,
      count(*) FILTER (
        WHERE to_char(
          coalesce(conv.assigned_advisor_at, conv.first_in) AT TIME ZONE 'America/Santiago',
          'YYYY-MM-DD'
        ) = ${today}
      )::int AS via_coalesce,
      count(*) FILTER (
        WHERE conv.assigned_advisor_at IS NOT NULL
          AND to_char(conv.assigned_advisor_at AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') = ${today}
      )::int AS via_at_only,
      count(*)::int AS assigned_now
    FROM users u
    LEFT JOIN conv ON conv.assigned_advisor_id = u.id
    WHERE u.role = 'asesora' AND u.active = true
    GROUP BY u.id, u.name
    ORDER BY u.name
  `;
  console.log("--- effective assignment date (COALESCE at, first_in)) ---");
  for (const r of effective) console.log(JSON.stringify(r));
} finally {
  await sql.end({ timeout: 5 });
}
