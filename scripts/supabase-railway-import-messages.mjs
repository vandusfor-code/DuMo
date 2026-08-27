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
const convIds = (diff.conversationsOnlyInSupabase ?? []).map((c) => c.id);
const targetIds = (diff.messagesOnlyInSupabase ?? []).map((m) => m.id);

if (convIds.length === 0 && targetIds.length === 0) {
  console.log("No hay conversaciones ni mensajes pendientes en el diff.");
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = postgres(dbUrl, { max: 1, prepare: false });

let convInserted = 0;
let convSkipped = 0;

if (convIds.length > 0) {
  const { data: convRows, error: convError } = await supabase
    .from("lead_conversations")
    .select("*")
    .in("id", convIds);

  if (convError) {
    console.error("Supabase lead_conversations fetch:", convError.message);
    process.exit(1);
  }

  const existingConv = await sql`SELECT id FROM lead_conversations WHERE id = ANY(${convIds})`;
  const existingConvIds = new Set(existingConv.map((r) => r.id));
  const convToInsert = (convRows ?? []).filter((r) => !existingConvIds.has(r.id));

  for (const row of convToInsert) {
    await sql`
      INSERT INTO lead_conversations (
        id, phone, customer_name, last_message, last_message_at,
        unread, status, online, dumo_phone_id, assigned_advisor_id,
        assigned_advisor_name, admin_status, last_message_direction, wa_chat_jid, company_id
      )
      VALUES (
        ${row.id},
        ${row.phone},
        ${row.customer_name ?? ""},
        ${row.last_message ?? ""},
        ${row.last_message_at},
        ${row.unread ?? 0},
        ${row.status ?? "new"},
        ${row.online ?? false},
        ${row.dumo_phone_id ?? null},
        ${row.assigned_advisor_id ?? null},
        ${row.assigned_advisor_name ?? null},
        ${row.admin_status ?? "nuevo"},
        ${row.last_message_direction ?? "in"},
        ${row.wa_chat_jid ?? null},
        ${row.company_id ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;
    convInserted += 1;
  }
  convSkipped = (convRows?.length ?? 0) - convToInsert.length;
}

if (targetIds.length === 0) {
  await sql.end();
  console.log(JSON.stringify({
    diffFile: path.resolve(diffPath),
    conversations: { requested: convIds.length, inserted: convInserted, alreadyOnRailway: convSkipped },
    messages: { requested: 0, inserted: 0, alreadyOnRailway: 0 },
  }, null, 2));
  process.exit(0);
}

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
  conversations: {
    requested: convIds.length,
    inserted: convInserted,
    alreadyOnRailway: convSkipped,
    ids: convIds,
  },
  messages: {
    requested: targetIds.length,
    fetchedFromSupabase: rows.length,
    alreadyOnRailway: skipped,
    inserted,
    ids: toInsert.map((r) => r.id),
  },
}, null, 2));
