#!/usr/bin/env node
/**
 * Backup Postgres vía Supabase REST (service role) cuando DATABASE_URL1 no está disponible localmente.
 * Uso: node --env-file=.env.vercel.production scripts/backup-db-supabase.mjs --output backups/dumo-backup.json
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--output");
const defaultName = `dumo-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const outputPath = outIdx >= 0 ? args[outIdx + 1] : path.join("backups", defaultName);

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error("Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
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

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

await mkdir(path.dirname(outputPath), { recursive: true });

const counts = {};
const data = {};

for (const table of TABLES) {
  const { data: rows, error } = await supabase.from(table).select("*");
  if (error) {
    counts[table] = `error: ${error.message}`;
    continue;
  }
  counts[table] = rows?.length ?? 0;
  data[table] = rows ?? [];
}

const payload = {
  exportedAt: new Date().toISOString(),
  method: "supabase-rest",
  supabaseProject: supabaseUrl,
  counts,
  data,
};

await writeFile(outputPath, JSON.stringify(payload));
const totalRows = Object.values(counts).reduce(
  (sum, n) => sum + (typeof n === "number" ? n : 0),
  0,
);
console.log(`Backup OK → ${path.resolve(outputPath)}`);
console.log(`Filas exportadas: ${totalRows}`);
console.log("Conteo por tabla:", counts);
