#!/usr/bin/env node
/**
 * Diff de lectura: filas en Supabase que no existen en Railway Postgres.
 * Uso:
 *   node --env-file=.env.vercel.production scripts/supabase-railway-diff.mjs
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dbUrl = loadRailwayTestDatabaseUrl();

if (!supabaseUrl || !serviceKey) {
  console.error("Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!dbUrl) {
  console.error("Requiere RAILWAY_TEST_DATABASE_URL (.env.railway.postgres.local).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sql = postgres(dbUrl, { max: 1, prepare: false });

async function fetchSupabaseConversations() {
  const { data, error } = await supabase.from("lead_conversations").select("*").order("id");
  if (error) throw new Error(`Supabase lead_conversations: ${error.message}`);
  return data ?? [];
}

async function fetchSupabaseMessages() {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("id, conversation_id, direction, body, created_at, message_type, read")
    .order("created_at");
  if (error) throw new Error(`Supabase lead_messages: ${error.message}`);
  return data ?? [];
}

async function fetchRailwayConversationIds() {
  const rows = await sql`SELECT id FROM lead_conversations ORDER BY id`;
  return new Set(rows.map((r) => r.id));
}

async function fetchRailwayMessageIds() {
  const rows = await sql`SELECT id FROM lead_messages ORDER BY id`;
  return new Set(rows.map((r) => r.id));
}

const [supConv, supMsg, rwConvIds, rwMsgIds] = await Promise.all([
  fetchSupabaseConversations(),
  fetchSupabaseMessages(),
  fetchRailwayConversationIds(),
  fetchRailwayMessageIds(),
]);

const convOnlySupabase = supConv.filter((c) => !rwConvIds.has(c.id));
const msgOnlySupabase = supMsg.filter((m) => !rwMsgIds.has(m.id));

const convOnlyIds = new Set(convOnlySupabase.map((c) => c.id));
const orphanMsgs = msgOnlySupabase.filter((m) => !convOnlyIds.has(m.conversation_id) && !rwConvIds.has(m.conversation_id));

const report = {
  generatedAt: new Date().toISOString(),
  supabase: {
    conversations: supConv.length,
    messages: supMsg.length,
  },
  railway: {
    conversations: rwConvIds.size,
    messages: rwMsgIds.size,
  },
  delta: {
    conversationsOnlyInSupabase: convOnlySupabase.length,
    messagesOnlyInSupabase: msgOnlySupabase.length,
  },
  conversationsOnlyInSupabase: convOnlySupabase.map((c) => ({
    id: c.id,
    phone: c.phone,
    customer_name: c.customer_name,
    last_message: c.last_message,
    last_message_at: c.last_message_at,
    status: c.status,
    assigned_advisor_id: c.assigned_advisor_id ?? null,
    dumo_phone_id: c.dumo_phone_id ?? null,
  })),
  messagesOnlyInSupabase: msgOnlySupabase.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    direction: m.direction,
    body: m.body,
    created_at: m.created_at,
    message_type: m.message_type,
    read: m.read,
  })),
  orphanMessagesOnlyInSupabase: orphanMsgs.map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    note: "conversation exists on Railway but message does not",
  })),
};

const outPath = path.join(
  "backups",
  `supabase-railway-diff-${new Date().toISOString().slice(0, 10)}.json`,
);
await writeFile(outPath, JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
console.log(`\nReporte guardado → ${path.resolve(outPath)}`);

await sql.end();
