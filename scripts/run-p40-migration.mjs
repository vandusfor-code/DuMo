#!/usr/bin/env node
/**
 * P4.0 — Aplica migración lead_follow_ups en BD (prod/staging).
 * Uso: node --env-file=.env.local scripts/run-p40-migration.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env.production.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k]) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[k] = val;
  }
}

const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

try {
  console.log("=== P4.0 migration — lead_follow_ups ===");

  await sql`
    CREATE TABLE IF NOT EXISTS lead_follow_ups (
      id text PRIMARY KEY,
      company_id text NOT NULL DEFAULT 'company-default',
      gestion_id text NOT NULL UNIQUE,
      conversation_id text NOT NULL,
      advisor_id text,
      advisor_name text NOT NULL DEFAULT '',
      customer_name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      tipification_slug text NOT NULL,
      follow_up_date date NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lead_follow_ups_status_check'
      ) THEN
        ALTER TABLE lead_follow_ups ADD CONSTRAINT lead_follow_ups_status_check
          CHECK (status IN ('pending', 'completed', 'cancelled'));
      END IF;
    END $$
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_date_status
    ON lead_follow_ups (follow_up_date, status)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_advisor_date
    ON lead_follow_ups (advisor_id, follow_up_date)
    WHERE status = 'pending'
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_conversation
    ON lead_follow_ups (conversation_id, created_at DESC)
  `;

  const [row] = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'lead_follow_ups'
    ) AS ok
  `;

  console.log("Tabla lead_follow_ups:", row?.ok ? "OK" : "FALTA");
  if (!row?.ok) process.exit(1);
  console.log("Migración P4.0 aplicada.");
} finally {
  await sql.end({ timeout: 5 });
}
