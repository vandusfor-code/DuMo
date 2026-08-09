#!/usr/bin/env node
/**
 * Backup Postgres sin pg_dump — exporta filas vía `postgres` npm.
 * Uso: node --env-file=.env.vercel.production scripts/backup-db-node.mjs
 *   o: npx vercel env run --environment=production -- node scripts/backup-db-node.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--output");
const defaultName = `dumo-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const outputPath = outIdx >= 0 ? args[outIdx + 1] : path.join("backups", defaultName);

const dbUrl =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim();

if (!dbUrl) {
  console.error("DATABASE_URL1 no disponible en el entorno.");
  process.exit(1);
}

function inspectPooler(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: u.port || "5432", user: u.username };
  } catch {
    return null;
  }
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
];

await mkdir(path.dirname(outputPath), { recursive: true });

const sql = postgres(dbUrl, { ssl: "require", prepare: false, max: 1 });
const meta = inspectPooler(dbUrl);
const counts = {};
const data = {};

try {
  for (const table of TABLES) {
    try {
      const exists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = ${table}
        ) AS ok
      `;
      if (!exists[0]?.ok) {
        counts[table] = null;
        continue;
      }
      const rows = await sql.unsafe(`SELECT * FROM ${table}`);
      counts[table] = rows.length;
      data[table] = rows;
    } catch (err) {
      counts[table] = `error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
} finally {
  await sql.end({ timeout: 5 });
}

const payload = {
  exportedAt: new Date().toISOString(),
  connection: meta,
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
