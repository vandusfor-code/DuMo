#!/usr/bin/env node
/**
 * Fase 3 — DDL en Postgres de prueba (mismas migraciones que DuMo).
 *
 * Uso:
 *   node --env-file=.env.railway.postgres.local scripts/railway-postgres-migrate.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runner = path.join(__dirname, "railway-postgres-migrate-runner.mjs");

const testUrl = loadRailwayTestDatabaseUrl();

if (!testUrl) {
  console.error("Define RAILWAY_TEST_DATABASE_URL con la URI del Postgres de prueba en Railway.");
  process.exit(1);
}

const result = spawnSync("npx", ["--yes", "tsx", runner], {
  cwd: root,
  env: { ...process.env, DATABASE_URL1: testUrl },
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
