#!/usr/bin/env node
/**
 * P1.6 — Evidencia: custom actualizadas + 4 slugs nuevos en catálogo.
 * Uso: node --env-file=.env.local scripts/verify-p16-tipifications.mjs
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

const CUSTOM_UPDATES = [
  {
    slug: "permanencia",
    id: "tipif-1786266090816-rcnnvl",
    closes: true,
    followUp: true,
    mode: "manual",
    days: null,
  },
  {
    slug: "deuda_wom",
    id: "tipif-1786266069311-tim48d",
    closes: true,
    followUp: true,
    mode: "manual_suggested",
    days: 7,
  },
  {
    slug: "deuda_compania_donante",
    id: "tipif-1786266123898-r5mu78",
    closes: true,
    followUp: true,
    mode: "manual_suggested",
    days: 7,
  },
];

const NEW_INSERTS = [
  { slug: "deuda", sort: 9, mode: "manual_suggested", days: 7 },
  { slug: "sin_cupo", sort: 10, mode: "manual", days: null },
  { slug: "no_responde", sort: 11, mode: "fixed", days: 2 },
  { slug: "cliente_indica_fecha", sort: 12, mode: "manual", days: null },
];

const DEBT_MATRIX_SLUGS = ["deuda", "deuda_wom", "deuda_compania_donante"];

function matches(row, expected) {
  return (
    row.closes_inbox === expected.closes &&
    row.creates_follow_up === expected.followUp &&
    row.follow_up_mode === expected.mode &&
    (expected.days === null ? row.follow_up_default_days === null : row.follow_up_default_days === expected.days)
  );
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

try {
  console.log("=== P1.6 — Tipificaciones custom (update in-place) ===\n");
  const failures = [];

  for (const expected of CUSTOM_UPDATES) {
    const [row] = await sql`
      SELECT id, slug, name, closes_inbox, creates_follow_up, follow_up_mode, follow_up_default_days, status
      FROM tipifications
      WHERE company_id = 'company-default' AND slug = ${expected.slug}
    `;
    if (!row) {
      console.log(`  ✗ ${expected.slug}: NO EXISTE en catálogo`);
      failures.push(`${expected.slug} missing`);
      continue;
    }
    if (row.id !== expected.id) {
      console.log(`  ✗ ${expected.slug}: id=${row.id} (esperado ${expected.id})`);
      failures.push(`${expected.slug} wrong id`);
      continue;
    }
    const ok = matches(row, expected);
    console.log(
      `  ${ok ? "✓" : "✗"} ${expected.slug} (${row.name}): closes=${row.closes_inbox} followUp=${row.creates_follow_up} mode=${row.follow_up_mode} days=${row.follow_up_default_days ?? "null"}`,
    );
    if (!ok) failures.push(`${expected.slug} behavior mismatch`);
  }

  console.log("\n=== P1.6 — 4 slugs nuevos en catálogo ===\n");

  for (const expected of NEW_INSERTS) {
    const [row] = await sql`
      SELECT slug, name, sort_order, closes_inbox, creates_follow_up, follow_up_mode, follow_up_default_days, status
      FROM tipifications
      WHERE company_id = 'company-default' AND slug = ${expected.slug}
    `;
    if (!row) {
      console.log(`  ✗ ${expected.slug}: NO INSERTADO`);
      failures.push(`insert ${expected.slug} missing`);
      continue;
    }
    const ok =
      row.status === "active" &&
      row.sort_order === expected.sort &&
      row.closes_inbox === true &&
      row.creates_follow_up === true &&
      row.follow_up_mode === expected.mode &&
      (expected.days === null ? row.follow_up_default_days === null : row.follow_up_default_days === expected.days);
    console.log(
      `  ${ok ? "✓" : "✗"} ${expected.slug} — "${row.name}" sort=${row.sort_order} mode=${row.follow_up_mode} days=${row.follow_up_default_days ?? "null"}`,
    );
    if (!ok) failures.push(`insert ${expected.slug} mismatch`);
  }

  console.log("\n=== Matriz de deuda (deuda / deuda_wom / deuda_compania_donante) ===\n");

  const debtRows = await sql`
    SELECT slug, follow_up_mode, follow_up_default_days, creates_follow_up, closes_inbox
    FROM tipifications
    WHERE company_id = 'company-default'
      AND slug = ANY(${DEBT_MATRIX_SLUGS})
    ORDER BY slug
  `;

  const debtOk = debtRows.length === 3 &&
    debtRows.every(
      (r) =>
        r.follow_up_mode === "manual_suggested" &&
        r.follow_up_default_days === 7 &&
        r.creates_follow_up === true &&
        r.closes_inbox === true,
    );

  for (const row of debtRows) {
    console.log(
      `  ${row.slug}: mode=${row.follow_up_mode} days=${row.follow_up_default_days} closes=${row.closes_inbox} followUp=${row.creates_follow_up}`,
    );
  }
  if (!debtOk) {
    failures.push("debt matrix incomplete or mismatch");
    console.log("  ✗ Matriz de deuda inconsistente");
  } else {
    console.log("  ✓ Matriz de deuda alineada (+7 manual_suggested)");
  }

  const [{ total }] = await sql`
    SELECT count(*)::int AS total FROM tipifications WHERE company_id = 'company-default' AND status = 'active'
  `;
  console.log(`\n=== Catálogo activo total: ${total} tipificaciones ===`);

  const catalog = await sql`
    SELECT sort_order, slug, name FROM tipifications
    WHERE company_id = 'company-default' AND status = 'active'
    ORDER BY sort_order ASC, slug ASC
  `;
  for (const row of catalog) {
    console.log(`  ${String(row.sort_order).padStart(2, " ")}. ${row.slug} — ${row.name}`);
  }

  if (failures.length) {
    console.error("\nFALLOS P1.6:", failures.join("; "));
    process.exit(1);
  }
  console.log("\nOK — P1.6 verificado (custom + inserts + matriz deuda).");
} finally {
  await sql.end({ timeout: 5 });
}
