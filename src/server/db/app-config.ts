import "server-only";
import type postgres from "postgres";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export function configRequiresDatabase(): boolean {
  return hasDatabase();
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const sql = getSql();
  if (!sql) return defaultValue;
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT value FROM app_config WHERE key = ${key} LIMIT 1
    `;
    const row = rows[0] as { value: T } | undefined;
    if (!row || row.value === null || row.value === undefined) return defaultValue;
    return row.value;
  } catch (err) {
    console.error(`[app-config] getConfig(${key})`, err);
    return defaultValue;
  }
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  const sql = requireSql();
  await ensureSchema();
  await sql`
    INSERT INTO app_config (key, value, updated_at)
    VALUES (${key}, ${sql.json(value as postgres.JSONValue)}, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now()
  `;
}
