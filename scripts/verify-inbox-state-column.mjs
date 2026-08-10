#!/usr/bin/env node
/**
 * P1.2 — Verifica columna inbox_state en lead_conversations.
 * Uso: node --env-file=.env.local scripts/verify-inbox-state-column.mjs
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

try {
  const cols = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'lead_conversations' AND column_name = 'inbox_state'
  `;

  if (cols.length !== 1) {
    console.error("Falta columna lead_conversations.inbox_state");
    process.exit(1);
  }

  console.log("Columna inbox_state:");
  const c = cols[0];
  console.log(`  type=${c.data_type} nullable=${c.is_nullable} default=${c.column_default ?? "null"}`);

  const constraints = await sql`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'lead_conversations'::regclass
      AND conname = 'lead_conversations_inbox_state_check'
  `;
  console.log("\nCHECK constraint:", constraints[0]?.def ?? "(no encontrado)");

  const indexes = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'lead_conversations'
      AND indexname = 'idx_lead_conversations_inbox_active'
  `;
  console.log("\nÍndice parcial:", indexes[0]?.indexdef ?? "(no encontrado)");

  const counts = await sql`
    SELECT inbox_state, count(*)::int AS n
    FROM lead_conversations
    GROUP BY inbox_state
    ORDER BY inbox_state
  `;

  console.log("\nDistribución inbox_state:");
  let total = 0;
  for (const row of counts) {
    console.log(`  ${row.inbox_state}: ${row.n}`);
    total += row.n;
  }
  console.log(`  TOTAL: ${total}`);

  const nullish = await sql`
    SELECT count(*)::int AS n
    FROM lead_conversations
    WHERE inbox_state IS NULL OR inbox_state = ''
  `;
  if (nullish[0]?.n > 0) {
    console.error(`\nHay ${nullish[0].n} filas sin inbox_state válido.`);
    process.exit(1);
  }

  const nonActive = counts.find((r) => r.inbox_state !== "active");
  if (nonActive) {
    console.log(`\nNota: ${nonActive.n} conversación(es) con inbox_state='${nonActive.inbox_state}' (esperado tras P1.4).`);
  } else {
    console.log("\nTodas las conversaciones existentes están en inbox_state='active' (backfill OK).");
  }

  console.log("\nOK: P1.2 inbox_state verificado.");
} finally {
  await sql.end({ timeout: 5 });
}
