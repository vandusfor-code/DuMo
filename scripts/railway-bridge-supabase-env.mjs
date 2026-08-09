#!/usr/bin/env node
/**
 * Configura variables Supabase en el servicio Railway del bridge (DuMo).
 * Uso: node scripts/railway-bridge-supabase-env.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.vercel.production");
const service = process.env.RAILWAY_BRIDGE_SERVICE ?? "DuMo";
const dryRun = process.argv.includes("--dry-run");

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
const supabaseUrl = parsed.NEXT_PUBLIC_SUPABASE_URL?.trim() || parsed.SUPABASE_URL?.trim();
const serviceKey = parsed.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.vercel.production");
  process.exit(1);
}

const toSet = {
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceKey,
  SUPABASE_STORAGE_BUCKET: parsed.SUPABASE_STORAGE_BUCKET?.trim() || "dumo-media",
  DUMO_COMPANY_ID: parsed.DUMO_COMPANY_ID?.trim() || "company-default",
};

console.log(`Railway service: ${service}`);
console.log("Variables:", Object.keys(toSet).join(", "));

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

console.log("\nOK — Supabase configurado en bridge Railway.");
