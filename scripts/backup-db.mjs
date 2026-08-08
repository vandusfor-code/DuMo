#!/usr/bin/env node
/**
 * Fase 0 — instrucciones de backup completo de Postgres (Supabase → archivo local).
 *
 * Requiere pg_dump instalado y DATABASE_URL1 (URI directa o pooler de solo lectura).
 *
 * Uso:
 *   node --env-file=.env.production.local scripts/backup-db.mjs
 *   node --env-file=.env.production.local scripts/backup-db.mjs --output backups/dumo-2026-08-08.sql
 */

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--output");
const defaultName = `dumo-backup-${new Date().toISOString().slice(0, 10)}.sql`;
const outputPath = outIdx >= 0 ? args[outIdx + 1] : path.join("backups", defaultName);

const dbUrl =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DATABASE_URL?.trim();

if (!dbUrl) {
  console.error("Define DATABASE_URL1 con la URI de Postgres.");
  process.exit(1);
}

await mkdir(path.dirname(outputPath), { recursive: true });

console.log(`Backup → ${outputPath}`);
console.log("Tablas: users, lead_conversations, lead_messages, media_assets, sales, …");

const child = spawn("pg_dump", ["--no-owner", "--no-acl", "--format=plain", dbUrl], {
  stdio: ["ignore", "pipe", "inherit"],
  shell: process.platform === "win32",
});

const chunks = [];
for await (const chunk of child.stdout) {
  chunks.push(chunk);
}

const code = await new Promise((resolve) => child.on("close", resolve));
if (code !== 0) {
  console.error(`pg_dump salió con código ${code}. ¿Está instalado pg_dump?`);
  process.exit(code ?? 1);
}

await writeFile(outputPath, Buffer.concat(chunks));
console.log(`Backup completado (${outputPath}). Verifica filas antes de migrar a Railway.`);
