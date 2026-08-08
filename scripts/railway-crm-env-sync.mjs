#!/usr/bin/env node
/**
 * Copia variables de Vercel (.env.vercel.production) a Railway servicio dumo-crm.
 * Excluye VERCEL_*, TURBO_*, NX_* y DATABASE_URL1 (usa referencia Postgres).
 *
 * Uso:
 *   node scripts/railway-crm-env-sync.mjs --dry-run
 *   node scripts/railway-crm-env-sync.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.vercel.production");
const dryRun = process.argv.includes("--dry-run");
const service = process.env.RAILWAY_CRM_SERVICE ?? "dumo-crm";

const SKIP_PREFIXES = ["VERCEL_", "TURBO_", "NX_"];
const SKIP_KEYS = new Set(["DATABASE_URL1", "DATABASE_URL", "NEXT_PUBLIC_APP_URL"]);

const OVERRIDES = {
  DATABASE_URL1: "${{Postgres.DATABASE_URL}}",
  NODE_ENV: "production",
};

function parseEnvFile(content) {
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return vars;
}

if (!existsSync(envFile)) {
  console.error("Falta .env.vercel.production");
  process.exit(1);
}

const parsed = parseEnvFile(readFileSync(envFile, "utf8"));
const toSet = { ...OVERRIDES };

for (const [key, val] of Object.entries(parsed)) {
  if (SKIP_KEYS.has(key)) continue;
  if (SKIP_PREFIXES.some((p) => key.startsWith(p))) continue;
  if (!val?.trim()) continue;
  toSet[key] = val;
}

console.log(`Variables (${service}):`, Object.keys(toSet).sort().join(", "));
console.log("Total:", Object.keys(toSet).length);

if (dryRun) {
  console.log("--dry-run OK");
  process.exit(0);
}

for (const [key, val] of Object.entries(toSet)) {
  const r = spawnSync(
    "npx",
    ["--yes", "@railway/cli", "variables", "set", `${key}=${val}`, "--service", service],
    { cwd: root, stdio: "inherit", shell: true },
  );
  if (r.status !== 0) {
    console.error(`Falló set ${key}`);
    process.exit(r.status ?? 1);
  }
}

console.log("\nOK. Configura NEXT_PUBLIC_APP_URL con el dominio Railway del CRM.");
