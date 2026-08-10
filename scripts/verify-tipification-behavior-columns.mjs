#!/usr/bin/env node
/**
 * P1.1 — Verifica columnas de comportamiento en tipifications.
 * Uso: node --env-file=.env.local scripts/verify-tipification-behavior-columns.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const url =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  loadRailwayTestDatabaseUrl();

if (!url) {
  console.error("No hay DATABASE_URL en el entorno.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

const EXPECTED_COLUMNS = [
  "closes_inbox",
  "creates_follow_up",
  "follow_up_mode",
  "follow_up_default_days",
];

const LEGACY_SEEDS = [
  { slug: "venta", closes: true, followUp: false, mode: "none", days: null },
  { slug: "consulta", closes: true, followUp: false, mode: "none", days: null },
  { slug: "seguimiento", closes: true, followUp: true, mode: "manual", days: null },
  { slug: "no_interesado", closes: true, followUp: false, mode: "none", days: null },
  { slug: "pendiente", closes: true, followUp: true, mode: "manual", days: null },
  { slug: "reagenda", closes: true, followUp: true, mode: "manual", days: null },
  { slug: "informacion", closes: true, followUp: false, mode: "none", days: null },
  { slug: "otro", closes: true, followUp: false, mode: "none", days: null },
];

try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'tipifications'
      AND column_name = ANY(${EXPECTED_COLUMNS})
    ORDER BY column_name
  `;

  console.log("Columnas P1.1 en information_schema:");
  for (const c of cols) {
    console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default ?? "null"}`);
  }

  const missing = EXPECTED_COLUMNS.filter((name) => !cols.some((c) => c.column_name === name));
  if (missing.length) {
    console.error("\nFaltan columnas:", missing.join(", "));
    process.exit(1);
  }

  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'tipifications'::regclass
      AND conname = 'tipifications_follow_up_mode_check'
  `;
  console.log("\nCHECK constraint:", constraints[0]?.def ?? "(no encontrado)");

  console.log("\nBackfill seeds legacy (8):");
  let ok = true;
  for (const expected of LEGACY_SEEDS) {
    const [row] = await sql`
      SELECT slug, closes_inbox, creates_follow_up, follow_up_mode, follow_up_default_days
      FROM tipifications
      WHERE company_id = 'company-default' AND slug = ${expected.slug}
    `;
    if (!row) {
      console.error(`  ✗ ${expected.slug}: no existe`);
      ok = false;
      continue;
    }
    const match =
      row.closes_inbox === expected.closes &&
      row.creates_follow_up === expected.followUp &&
      row.follow_up_mode === expected.mode &&
      (expected.days === null ? row.follow_up_default_days === null : row.follow_up_default_days === expected.days);
    console.log(
      `  ${match ? "✓" : "✗"} ${expected.slug}: closes=${row.closes_inbox} followUp=${row.creates_follow_up} mode=${row.follow_up_mode} days=${row.follow_up_default_days ?? "null"}`,
    );
    if (!match) ok = false;
  }

  if (!ok) process.exit(1);
  console.log("\nOK: P1.1 columnas y backfill legacy verificados.");
} finally {
  await sql.end({ timeout: 5 });
}
