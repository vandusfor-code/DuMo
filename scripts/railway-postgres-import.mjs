#!/usr/bin/env node
/**
 * Fase 3 — importa backup JSON a Postgres de prueba (Railway).
 *
 * Uso:
 *   node scripts/railway-postgres-import.mjs --file backups/dumo-backup-2026-08-08.json
 *   node --env-file=.env.railway.postgres.local scripts/railway-postgres-import.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const args = process.argv.slice(2);
const fileIdx = args.indexOf("--file");
const backupPath =
  fileIdx >= 0 ? args[fileIdx + 1] : path.join("backups", "dumo-backup-2026-08-08.json");

const dbUrl = loadRailwayTestDatabaseUrl();

if (!dbUrl) {
  console.error("Define RAILWAY_TEST_DATABASE_URL.");
  process.exit(1);
}

/** Orden respetando FKs aproximadas */
const IMPORT_ORDER = [
  "users",
  "app_config",
  "connected_numbers",
  "crm_clients",
  "lead_conversations",
  "media_assets",
  "lead_messages",
  "lead_notes",
  "lead_gestiones",
  "sales",
  "sale_lines",
  "accounting_expenses",
  "commission_payments",
  "whatsapp_channels",
  "web_qr_sessions",
];

/** Columnas jsonb por tabla — normalizar para postgres.js */
const JSONB_COLUMNS = {
  app_config: ["value"],
  lead_gestiones: [
    "requested_plan_json",
    "approved_plan_json",
    "recommendation_json",
    "sales_script",
    "lines",
  ],
};

function normalizeRows(table, rows, sql) {
  const jsonCols = JSONB_COLUMNS[table];
  if (!jsonCols?.length) return rows;
  return rows.map((row) => {
    const copy = { ...row };
    for (const col of jsonCols) {
      if (col in copy && copy[col] !== undefined && copy[col] !== null) {
        copy[col] = sql.json(copy[col]);
      }
    }
    return copy;
  });
}

const fresh = args.includes("--fresh");
const raw = JSON.parse(await readFile(backupPath, "utf8"));
const backupCounts = raw.counts ?? {};
const data = raw.data ?? {};

const sql = postgres(dbUrl, { ssl: "require", prepare: false, max: 1 });

const imported = {};

try {
  if (fresh) {
    for (const table of [...IMPORT_ORDER].reverse()) {
      try {
        await sql`TRUNCATE TABLE ${sql(table)} CASCADE`;
      } catch {
        /* tabla puede no existir */
      }
    }
    console.log("Tablas truncadas (--fresh).");
  }

  for (const table of IMPORT_ORDER) {
    const rows = data[table];
    if (!Array.isArray(rows) || rows.length === 0) {
      imported[table] = 0;
      continue;
    }

    const exists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) AS ok
    `;
    if (!exists[0]?.ok) {
      imported[table] = `skip: tabla ${table} no existe (¿corriste migrate?)`;
      continue;
    }

    const chunkSize = 100;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = normalizeRows(table, rows.slice(i, i + chunkSize), sql);
      await sql`INSERT INTO ${sql(table)} ${sql(chunk)} ON CONFLICT DO NOTHING`;
      inserted += chunk.length;
    }
    imported[table] = inserted;
  }
} finally {
  await sql.end({ timeout: 5 });
}

const total = Object.values(imported).reduce(
  (sum, n) => sum + (typeof n === "number" ? n : 0),
  0,
);

console.log(`Import OK desde ${path.resolve(backupPath)}`);
console.log("Backup exportado:", raw.exportedAt);
console.log("Filas importadas (intentadas):", total);
console.log("Por tabla:", imported);
console.log("Conteo backup original:", backupCounts);
