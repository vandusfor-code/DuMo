#!/usr/bin/env node
/**
 * Resetea asesoras de prueba a estado limpio (disponible, token_version=0).
 * Uso:
 *   npx tsx --env-file=.env.railway.postgres.local scripts/reset-advisor-presence-test-data.mjs
 */

import postgres from "postgres";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const url =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  loadRailwayTestDatabaseUrl();

if (!url) {
  console.error("No hay DATABASE_URL1 / RAILWAY_TEST_DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

try {
  const before = await sql`
    SELECT id, name, presence_status, token_version, presence_updated_by
    FROM users
    WHERE role = 'asesora'
    ORDER BY name
  `;

  console.log("Antes del reset:");
  for (const row of before) {
    console.log(
      `  ${row.name}: status=${row.presence_status}, token_version=${row.token_version}, updated_by=${row.presence_updated_by ?? "—"}`,
    );
  }

  await sql`
    UPDATE users
    SET presence_status = 'disponible',
        token_version = 0,
        presence_updated_by = NULL,
        presence_updated_at = NULL
    WHERE role = 'asesora'
  `;

  const after = await sql`
    SELECT id, name, presence_status, token_version
    FROM users
    WHERE role = 'asesora'
    ORDER BY name
  `;

  console.log("\nTras reset:");
  for (const row of after) {
    console.log(`  ${row.name}: status=${row.presence_status}, token_version=${row.token_version}`);
  }

  const bad = after.filter((r) => r.presence_status !== "disponible" || r.token_version !== 0);
  if (bad.length > 0) {
    console.error("\nERROR: algunas asesoras no quedaron en estado limpio.");
    process.exit(1);
  }

  console.log("\nOK: todas las asesoras en disponible / token_version=0.");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
