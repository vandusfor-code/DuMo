#!/usr/bin/env node
/**
 * Aplica migraciones DDL fuera del request path (Fase 1).
 *
 * Uso local (con .env.local cargado):
 *   node --env-file=.env.local scripts/migrate-db.mjs
 *
 * Uso CI / post-deploy (contra URL desplegada):
 *   MIGRATE_URL=https://du-mo.vercel.app MIGRATE_DB_SECRET=... node scripts/migrate-db.mjs
 */

const base = (process.env.MIGRATE_URL || process.env.DUMO_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const secret = process.env.MIGRATE_DB_SECRET?.trim();

if (!secret) {
  console.error("Falta MIGRATE_DB_SECRET en el entorno.");
  process.exit(1);
}

const url = `${base}/api/system/migrate`;

console.log(`Migrando esquema vía ${url} …`);

const res = await fetch(url, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Migrate-Db-Secret": secret,
  },
  signal: AbortSignal.timeout(120_000),
});

let body;
try {
  body = await res.json();
} catch {
  body = { message: await res.text() };
}

if (!res.ok || !body.ok) {
  console.error("Migración falló:", body);
  process.exit(1);
}

console.log("OK:", body.message);
if (body.poolerWarnings?.length) {
  console.warn("Advertencias pooler:", body.poolerWarnings);
}
