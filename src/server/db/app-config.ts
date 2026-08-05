import "server-only";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export function configRequiresDatabase(): boolean {
  return hasDatabase();
}

export async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const sql = getSql();
  if (!sql) return defaultValue;
  await ensureSchema();
  const rows = await sql`
    SELECT value FROM app_config WHERE key = ${key} LIMIT 1
  `;
  const row = rows[0] as { value: T } | undefined;
  if (!row) return defaultValue;
  return row.value;
}

export async function setConfig<T>(key: string, value: T): Promise<void> {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL no configurada. No se puede guardar la configuración.");
  }
  await ensureSchema();
  await sql`
    INSERT INTO app_config (key, value, updated_at)
    VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = now()
  `;
}
