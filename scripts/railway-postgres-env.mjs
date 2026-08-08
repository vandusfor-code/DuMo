import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envFile = path.join(root, ".env.railway.postgres.local");

/** Prefer `.env.railway.postgres.local` over inherited shell env (evita localhost stale). */
export function loadRailwayTestDatabaseUrl() {
  if (existsSync(envFile)) {
    const raw = readFileSync(envFile, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^RAILWAY_TEST_DATABASE_URL=(.+)$/);
      if (m?.[1]) return m[1].trim();
    }
  }
  return (
    process.env.RAILWAY_TEST_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    null
  );
}
