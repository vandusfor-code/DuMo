#!/usr/bin/env node
/**
 * Verifica que la tabla tipifications exista y tenga los 8 seeds.
 * Uso:
 *   node --env-file=.env.local scripts/verify-tipifications-seed.mjs
 *   node --env-file=.env.railway.postgres.local scripts/verify-tipifications-seed.mjs
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
  const rows = await sql`
    SELECT slug, name, badge_bg, badge_text, triggers_sale_flow, sort_order
    FROM tipifications
    WHERE company_id = 'company-default'
    ORDER BY sort_order ASC
  `;

  console.log(`Tipificaciones en BD: ${rows.length}`);
  for (const row of rows) {
    console.log(
      `  ${row.sort_order}. ${row.slug} (${row.name}) — saleFlow=${row.triggers_sale_flow} — ${row.badge_bg}/${row.badge_text}`,
    );
  }

  if (rows.length !== 8) {
    console.error("\nSe esperaban 8 filas. Ejecuta migración (dev server o POST /api/system/migrate).");
    process.exit(1);
  }

  const venta = rows.find((r) => r.slug === "venta");
  if (!venta?.triggers_sale_flow) {
    console.error('\n"venta" debe tener triggers_sale_flow = true.');
    process.exit(1);
  }

  console.log("\nOK: seed de tipificaciones completo.");
} catch (error) {
  if (String(error).includes("tipifications")) {
    console.error("La tabla tipifications no existe aún. Corre la migración primero.");
  } else {
    console.error(error);
  }
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
