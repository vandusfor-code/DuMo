#!/usr/bin/env node
/**
 * Import selectivo: mensajes que existen en Supabase pero no en Railway.
 * Uso:
 *   node --env-file=.env.vercel.production scripts/supabase-railway-import-messages.mjs
 *   node --env-file=.env.vercel.production scripts/supabase-railway-import-messages.mjs --file backups/supabase-railway-diff-2026-08-09.json
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const diffPath =
  fileIdx >= 0
    ? args[fileIdx + 1]
    : path.join("backups", `supabase-railway-diff-${new Date().toISOString().slice(0, 10)}.json`);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = loadRailwayTestDatabaseUrl();

if (!supabaseUrl || !serviceKey || !dbUrl) {
  console.error("Requiere Supabase + RAILWAY_TEST_DATABASE_URL.");
  process.exit(1);
}

const diff = JSON.parse(await readFile(diffPath, "utf8"));
const targetIds = (diff.messagesOnlyInSupabase ?? []).map((m) => m.id);

if (targetIds.length === 0) {
  console.log("No hay mensajes pendientes en el diff.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: rows, error } = await supabase
  .from("lead_messages")
  .select("*")
  .in("id", targetIds);

if (error) {
  console.error("Supabase fetch:", error.message);
  process.exit(1);
}

if (!rows?.length) {
  console.error("No se encontraron filas en Supabase para los IDs del diff.");
  process.exit(1);
}

const sql = postgres(dbUrl, { max: 1, prepare: false });

const existing = await sql`SELECT id FROM lead_messages WHERE id = ANY(${targetIds})`;
const existingIds = new Set(existing.map((r) => r.id));
const toInsert = rows.filter((r) => !existingIds.has(r.id));

let inserted = 0;
let skipped = 0;

try {
  for (const row of toInsert) {
    await sql`
      INSERT INTO lead_messages (
        id, conversation_id, direction, body, created_at, read,
        message_type, media_asset_id, caption, company_id
      )
      VALUES (
        ${row.id},
        ${row.conversation_id},
        ${row.direction},
        ${row.body ?? ""},
        ${row.created_at},
        ${row.read ?? false},
        ${row.message_type ?? "text"},
        ${row.media_asset_id ?? null},
        ${row.caption ?? null},
        ${row.company_id ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    inserted += 1;
  }
  skipped = rows.length - toInsert.length;
} finally {
  await sql.end();
}

console.log(JSON.stringify({
  diffFile: path.resolve(diffPath),
  requested: targetIds.length,
  fetchedFromSupabase: rows.length,
  alreadyOnRailway: skipped,
  inserted,
  ids: toInsert.map((r) => r.id),
}, null, 2));
