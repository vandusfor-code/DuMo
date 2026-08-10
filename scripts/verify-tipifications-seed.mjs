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
    SELECT
      slug,
      name,
      triggers_sale_flow,
      sort_order,
      closes_inbox,
      creates_follow_up,
      follow_up_mode,
      follow_up_default_days
    FROM tipifications
    WHERE company_id = 'company-default'
    ORDER BY sort_order ASC
  `;

  console.log(`Tipificaciones en BD: ${rows.length}`);
  for (const row of rows) {
    console.log(
      `  ${row.sort_order}. ${row.slug} — closes=${row.closes_inbox} followUp=${row.creates_follow_up} mode=${row.follow_up_mode} days=${row.follow_up_default_days ?? "null"} saleFlow=${row.triggers_sale_flow}`,
    );
  }

  if (rows.length < 12) {
    console.error(`\nSe esperaban al menos 12 filas (8 legacy + 4 P1.6). Hay ${rows.length}. Ejecuta scripts/run-p16-tipification-migration.mjs`);
    process.exit(1);
  }

  const P16_NEW = ["deuda", "sin_cupo", "no_responde", "cliente_indica_fecha"];
  for (const slug of P16_NEW) {
    if (!rows.some((r) => r.slug === slug)) {
      console.error(`\nFalta slug P1.6: ${slug}`);
      process.exit(1);
    }
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
