#!/usr/bin/env node
/**
 * Verifica persistencia de delete en catálogo de equipos (sin importar server-only).
 * Uso: npx --yes tsx scripts/verify-equipment-delete.mjs
 */

import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";
import postgres from "postgres";

const CATALOG_KEY = "equipment_catalog";
const SEEDED_KEY = "equipment_catalog_seeded";

const url = loadRailwayTestDatabaseUrl();
if (!url) {
  console.error("Requiere RAILWAY_TEST_DATABASE_URL en .env.railway.postgres.local");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", prepare: false, max: 1 });

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

async function readCatalog() {
  const rows = await sql`
    SELECT value FROM app_config WHERE key = ${CATALOG_KEY} LIMIT 1
  `;
  const value = rows[0]?.value;
  return Array.isArray(value) ? value : [];
}

async function writeCatalog(items) {
  await sql`
    INSERT INTO app_config (key, value, updated_at)
    VALUES (${CATALOG_KEY}, ${sql.json(items)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  await sql`
    INSERT INTO app_config (key, value, updated_at)
    VALUES (${SEEDED_KEY}, ${sql.json(true)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}

try {
  const testId = `eq-verify-${Date.now()}`;
  const testItem = {
    id: testId,
    commercialName: "Equipo Verificación Delete",
    brand: "TestBrand",
    model: "DeleteProbe",
    totalValue: 100000,
    downPayment: 10000,
    installmentsCount: 12,
    installmentValue: 7500,
    commercialText: "Solo para prueba",
    isPieCero: false,
    status: "active",
  };

  console.log("=== Crear → eliminar → re-leer BD (simula refresh) ===");

  const before = await readCatalog();
  await writeCatalog([...before, testItem]);

  const afterCreate = await readCatalog();
  assert("BD incluye equipo creado", afterCreate.some((i) => i.id === testId));

  const withoutDeleted = afterCreate.filter((i) => i.id !== testId);
  await writeCatalog(withoutDeleted);

  const afterDelete = await readCatalog();
  assert("BD NO incluye equipo eliminado", !afterDelete.some((i) => i.id === testId));

  const afterDelete2 = await readCatalog();
  assert("re-lectura: eliminado sigue ausente", !afterDelete2.some((i) => i.id === testId));

  console.log("\n=== Catálogo vacío no re-seedea mock (flag seeded) ===");
  await writeCatalog([]);

  const seededRows = await sql`
    SELECT value FROM app_config WHERE key = ${SEEDED_KEY} LIMIT 1
  `;
  assert("equipment_catalog_seeded = true", seededRows[0]?.value === true);

  const empty = await readCatalog();
  assert("catálogo vacío persiste", empty.length === 0);

  const empty2 = await readCatalog();
  assert("re-lectura: sigue vacío (sin mock)", empty2.length === 0);

  console.log("\n=== Simular load() con catálogo ya inicializado ===");
  const keyExists = await sql`
    SELECT 1 FROM app_config WHERE key = ${CATALOG_KEY} LIMIT 1
  `;
  assert("clave equipment_catalog existe", keyExists.length > 0);

  const mockWouldSeed = empty2.length === 0 && keyExists.length === 0;
  assert("load() NO re-seedearía (clave existe + [])", !mockWouldSeed);
} finally {
  await sql.end({ timeout: 5 });
}

console.log(`\n=== Resultado: ${passed} OK, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
console.log("\nDelete persistente verificado contra Postgres.");
