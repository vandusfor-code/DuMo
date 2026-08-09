import "server-only";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export const EQUIPMENT_CATALOG_KEY = "equipment_catalog";
export const EQUIPMENT_CATALOG_SEEDED_KEY = "equipment_catalog_seeded";

export function configRequiresDatabase(): boolean {
  return hasDatabase();
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL no configurada.");
  return sql;
}

/** Indica si existe una fila en app_config para la clave (aunque value sea []). */
export async function hasConfigKey(key: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  try {
    await ensureSchema();
    const rows = await sql`
      SELECT 1 FROM app_config WHERE key = ${key} LIMIT 1
    `;
    return rows.length > 0;
  } catch (err) {
    console.error(`[app-config] hasConfigKey(${key})`, err);
    return false;
  }
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
    VALUES (${key}, ${sql.json(value as import("postgres").JSONValue)}, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now()
  `;
}
