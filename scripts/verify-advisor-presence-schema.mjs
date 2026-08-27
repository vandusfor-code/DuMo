#!/usr/bin/env node
/**
 * Verifica columnas de presencia de asesora (módulo Live, etapa 1).
 * Uso:
 *   node --env-file=.env.railway.postgres.local scripts/verify-advisor-presence-schema.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const EXPECTED_COLUMNS = [
  "presence_status",
  "presence_updated_at",
  "presence_updated_by",
  "token_version",
];

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
  const columns = await sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = ANY(${EXPECTED_COLUMNS})
    ORDER BY column_name
  `;

  console.log("Columnas de presencia en users:");
  for (const col of columns) {
    console.log(
      `  - ${col.column_name}: ${col.data_type}, nullable=${col.is_nullable}, default=${col.column_default ?? "—"}`,
    );
  }

  const missing = EXPECTED_COLUMNS.filter((name) => !columns.some((c) => c.column_name === name));
  if (missing.length > 0) {
    console.error(`\nFaltan columnas: ${missing.join(", ")}`);
    console.error("Ejecuta: node --env-file=.env.railway.postgres.local scripts/railway-postgres-migrate.mjs");
    process.exit(1);
  }

  const constraint = await sql`
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND conname = 'users_presence_status_check'
  `;
  console.log(`\nCHECK users_presence_status_check: ${constraint.length > 0 ? "presente" : "AUSENTE"}`);

  const index = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND indexname = 'idx_users_presence_status'
  `;
  console.log(`Índice idx_users_presence_status: ${index.length > 0 ? "presente" : "AUSENTE"}`);

  const byStatus = await sql`
    SELECT presence_status, count(*)::int AS n
    FROM users
    GROUP BY presence_status
    ORDER BY presence_status
  `;
  console.log("\nUsuarios por presence_status:");
  for (const row of byStatus) {
    console.log(`  ${row.presence_status}: ${row.n}`);
  }

  const tokenStats = await sql`
    SELECT
      min(token_version)::int AS min_v,
      max(token_version)::int AS max_v,
      count(*) FILTER (WHERE token_version <> 0)::int AS non_zero
    FROM users
  `;
  const stats = tokenStats[0];
  console.log(
    `\ntoken_version: min=${stats.min_v}, max=${stats.max_v}, usuarios con valor != 0: ${stats.non_zero}`,
  );

  const asesoras = await sql`
    SELECT id, name, role, presence_status, token_version
    FROM users
    WHERE role = 'asesora'
    ORDER BY name
    LIMIT 10
  `;
  if (asesoras.length > 0) {
    console.log("\nMuestra asesoras (hasta 10):");
    for (const a of asesoras) {
      console.log(`  ${a.name}: status=${a.presence_status}, token_version=${a.token_version}`);
    }
  }

  const invalid = await sql`
    SELECT count(*)::int AS n
    FROM users
    WHERE presence_status NOT IN ('disponible', 'bano', 'almuerzo', 'desconectado')
  `;
  if (invalid[0].n > 0) {
    console.error(`\n${invalid[0].n} usuario(s) con presence_status inválido.`);
    process.exit(1);
  }

  if (stats.non_zero > 0) {
    console.error("\nSe esperaba token_version = 0 para todos tras migración inicial.");
    process.exit(1);
  }

  console.log("\nOK: esquema de presencia de asesora (etapa 1) verificado.");
} catch (error) {
  if (String(error).includes("presence_status")) {
    console.error("Las columnas de presencia no existen aún. Corre la migración primero.");
  } else {
    console.error(error);
  }
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
