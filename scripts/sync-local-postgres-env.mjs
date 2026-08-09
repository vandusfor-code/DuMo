#!/usr/bin/env node
/**
 * Añade DATABASE_URL1 a .env.local para dev local (login, leads, tipificaciones).
 * Toma la URI de .env.railway.postgres.local sin sobrescribir Google Sheets ni otras vars.
 *
 * Uso:
 *   node scripts/sync-local-postgres-env.mjs
 *   node scripts/sync-local-postgres-env.mjs --supabase   # usa DATABASE_URL1 de .env.vercel.production
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envLocalPath = path.join(root, ".env.local");
const useSupabase = process.argv.includes("--supabase");

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const vars = new Map();
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars.set(trimmed.slice(0, eq).trim(), trimmed.slice(eq + 1).trim());
  }
  return { lines, vars };
}

function readDatabaseUrl1FromVercelProduction() {
  const file = path.join(root, ".env.vercel.production");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL1=(.+)$/);
    if (m?.[1]) {
      const val = m[1].trim().replace(/^["']|["']$/g, "");
      return val || null;
    }
  }
  return null;
}

let databaseUrl = null;
let source = "";

if (useSupabase) {
  databaseUrl = readDatabaseUrl1FromVercelProduction();
  source = ".env.vercel.production (Supabase prod)";
} else {
  databaseUrl = loadRailwayTestDatabaseUrl();
  source = ".env.railway.postgres.local (Railway staging)";
}

if (!databaseUrl) {
  console.error(
    useSupabase
      ? "No hay DATABASE_URL1 en .env.vercel.production. Ejecuta: vercel env pull .env.vercel.production"
      : "No hay RAILWAY_TEST_DATABASE_URL. Copia .env.railway.postgres.local.example → .env.railway.postgres.local",
  );
  process.exit(1);
}

const existing = existsSync(envLocalPath) ? readFileSync(envLocalPath, "utf8") : "";
const { lines, vars } = parseEnv(existing);

vars.set("DATABASE_URL1", databaseUrl);
if (!vars.has("ALLOW_RUNTIME_MIGRATIONS")) {
  vars.set("ALLOW_RUNTIME_MIGRATIONS", "1");
}

const preservedComments = lines.filter((line) => {
  const t = line.trim();
  return !t || t.startsWith("#") || t.indexOf("=") <= 0;
});

const dbKeys = new Set(["DATABASE_URL1", "DATABASE_URL", "ALLOW_RUNTIME_MIGRATIONS"]);
const otherLines = lines.filter((line) => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return false;
  const key = t.slice(0, t.indexOf("=")).trim();
  return key && !dbKeys.has(key);
});

const out = [
  ...preservedComments.filter((l) => !l.includes("sync-local-postgres-env")),
  "",
  "# Postgres local dev — scripts/sync-local-postgres-env.mjs",
  `# Fuente: ${source}`,
  `DATABASE_URL1=${databaseUrl}`,
  `ALLOW_RUNTIME_MIGRATIONS=${vars.get("ALLOW_RUNTIME_MIGRATIONS")}`,
  "",
  ...otherLines.filter((l) => {
    const key = l.trim().slice(0, l.trim().indexOf("=")).trim();
    return key && !dbKeys.has(key);
  }),
]
  .join("\n")
  .replace(/\n{3,}/g, "\n\n")
  .trimEnd()
  .concat("\n");

writeFileSync(envLocalPath, out, "utf8");

console.log("✅ .env.local actualizado con DATABASE_URL1");
console.log(`   Fuente: ${source}`);
console.log("   ALLOW_RUNTIME_MIGRATIONS=1 (migraciones en dev)");
console.log("");
console.log("👉 Reinicia el servidor: npm run dev");
console.log("");
console.log("Notas:");
console.log("  • Railway staging: usuarios importados del backup Supabase (Geral.Lizarazo, Carolina.wom, etc.)");
console.log("  • Supabase prod: node scripts/sync-local-postgres-env.mjs --supabase (tras vercel env pull)");
console.log("  • Seed admin local: duvan.ramos / ventaswom@dulabs.co (solo si no existe en la BD)");
