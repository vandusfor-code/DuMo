#!/usr/bin/env node
/**
 * Fase 3 — verifica conteos en Postgres de prueba vs backup y vs producción (Supabase).
 *
 * Uso:
 *   node --env-file=.env.railway.postgres.local scripts/railway-postgres-verify.mjs
 *   node --env-file=.env.railway.postgres.local --env-file=.env.vercel.production scripts/railway-postgres-verify.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const backupPath = path.join("backups", "dumo-backup-2026-08-08.json");
const dbUrl = loadRailwayTestDatabaseUrl();

if (!dbUrl) {
  console.error("Define RAILWAY_TEST_DATABASE_URL.");
  process.exit(1);
}

const TABLES = [
  "users",
  "lead_conversations",
  "lead_messages",
  "lead_notes",
  "media_assets",
  "sales",
  "sale_lines",
  "lead_gestiones",
  "crm_clients",
  "whatsapp_channels",
  "web_qr_sessions",
  "connected_numbers",
  "app_config",
  "accounting_expenses",
  "commission_payments",
];

const backup = JSON.parse(await readFile(backupPath, "utf8"));
const backupCounts = backup.counts ?? {};

const sql = postgres(dbUrl, { ssl: "require", prepare: false, max: 1 });
const railwayCounts = {};

try {
  for (const table of TABLES) {
    try {
      const [{ n }] = await sql`SELECT count(*)::int AS n FROM ${sql(table)}`;
      railwayCounts[table] = n;
    } catch (err) {
      railwayCounts[table] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}

let prodCounts = null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (supabaseUrl && serviceKey) {
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
  prodCounts = {};
  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    prodCounts[table] = error ? `error: ${error.message}` : (count ?? 0);
  }
}

const rows = TABLES.map((table) => {
  const backupN = backupCounts[table];
  const railwayN = railwayCounts[table];
  const prodN = prodCounts?.[table];
  const matchBackup =
    typeof backupN === "number" && typeof railwayN === "number" ? backupN === railwayN : null;
  const prodGteBackup =
    typeof backupN === "number" && typeof prodN === "number" ? prodN >= backupN : null;
  return { table, backup: backupN, railway: railwayN, production: prodN, matchBackup, prodGteBackup };
});

const railwayTotal = Object.values(railwayCounts).reduce(
  (s, n) => s + (typeof n === "number" ? n : 0),
  0,
);
const backupTotal = Object.values(backupCounts).reduce(
  (s, n) => s + (typeof n === "number" ? n : 0),
  0,
);

const mismatches = rows.filter((r) => r.matchBackup === false);
const ok = mismatches.length === 0;

console.log(JSON.stringify({ ok, backupTotal, railwayTotal, backupExportedAt: backup.exportedAt, rows }, null, 2));

if (!ok) {
  console.error("\nDISCREPANCIAS vs backup:", mismatches);
  process.exit(1);
}

console.log("\nIntegridad OK — Postgres de prueba coincide con el backup.");
