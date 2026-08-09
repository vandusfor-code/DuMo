#!/usr/bin/env node
/**
 * Verifica la lógica de flujo de venta basada en tipificaciones (etapa 3).
 * Uso: npx --yes tsx scripts/verify-sale-flow-tipification.mjs
 */

import {
  buildFallbackTipificationCatalog,
  fallbackTriggersSaleFlow,
  triggersSaleFlowFromCatalog,
} from "../src/lib/tipification-utils.ts";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";
import postgres from "postgres";

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    console.log(`  OK  ${name}`);
    passed += 1;
  } else {
    console.error(` FAIL ${name}`);
    failed += 1;
  }
}

const catalog = buildFallbackTipificationCatalog();

console.log("=== Verificación lógica (sin BD) ===");
assert('slug "venta" activa flujo en catálogo seed', triggersSaleFlowFromCatalog("venta", catalog));
assert(
  'slug "seguimiento" NO activa flujo en catálogo seed',
  !triggersSaleFlowFromCatalog("seguimiento", catalog),
);
assert('fallback "venta" → true', fallbackTriggersSaleFlow("venta"));
assert('fallback "consulta" → false', !fallbackTriggersSaleFlow("consulta"));
assert(
  "catálogo vacío + venta usa fallback",
  triggersSaleFlowFromCatalog("venta", []) === true,
);

console.log("\n=== Verificación BD (tipificaciones) ===");
const url = loadRailwayTestDatabaseUrl();
if (url) {
  const sql = postgres(url, { ssl: "require", prepare: false });
  try {
    const rows = await sql`
      SELECT slug, triggers_sale_flow FROM tipifications
      WHERE company_id = 'company-default'
      ORDER BY sort_order ASC
    `;
    assert("BD tiene 8 tipificaciones", rows.length === 8);
    const venta = rows.find((r) => r.slug === "venta");
    assert('BD: venta.triggers_sale_flow = true', venta?.triggers_sale_flow === true);
    const seguimiento = rows.find((r) => r.slug === "seguimiento");
    assert(
      "BD: seguimiento.triggers_sale_flow = false",
      seguimiento?.triggers_sale_flow === false,
    );

    const dbCatalog = rows.map((r) => ({
      slug: r.slug,
      triggersSaleFlow: r.triggers_sale_flow,
    }));
    assert(
      "BD: lookup venta activa flujo",
      triggersSaleFlowFromCatalog("venta", dbCatalog),
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
} else {
  console.log("  (omitido — sin RAILWAY_TEST_DATABASE_URL)");
}

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
console.log("\nFlujo de venta: la tipificación 'venta' mantiene triggersSaleFlow=true.");
console.log("Manual en UI: seleccionar Tipificación 'Venta' → SaleDetails + Script + Nueva venta.");
