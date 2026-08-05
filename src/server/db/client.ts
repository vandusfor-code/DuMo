import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let sqlSingleton: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;
let schemaReady = false;

export function getSql(): NeonQueryFunction<false, false> | null {
  if (sqlSingleton) return sqlSingleton;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  sqlSingleton = neon(url);
  return sqlSingleton;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Reintenta consultas ante timeouts transitorios de Neon/Vercel. */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function runMigrations(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS lead_conversations (
      id text PRIMARY KEY,
      phone text NOT NULL,
      customer_name text NOT NULL DEFAULT '',
      last_message text NOT NULL DEFAULT '',
      last_message_at timestamptz NOT NULL DEFAULT now(),
      unread integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'new',
      online boolean NOT NULL DEFAULT false
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_messages (
      id text PRIMARY KEY,
      conversation_id text NOT NULL,
      direction text NOT NULL,
      body text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      read boolean NOT NULL DEFAULT false
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_messages_conv
    ON lead_messages (conversation_id, created_at)
  `;
  await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS dumo_phone_id text`;
  await sql`
    CREATE TABLE IF NOT EXISTS connected_numbers (
      phone_number_id text PRIMARY KEY,
      display_phone text NOT NULL DEFAULT '',
      waba_id text NOT NULL DEFAULT '',
      label text NOT NULL DEFAULT '',
      connected_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE connected_numbers ADD COLUMN IF NOT EXISTS access_token text`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      username text UNIQUE NOT NULL,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      name text NOT NULL,
      role text NOT NULL,
      active boolean NOT NULL DEFAULT true,
      avatar_url text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS app_config (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS accounting_expenses (
      id text PRIMARY KEY,
      date date NOT NULL,
      category text NOT NULL,
      description text NOT NULL DEFAULT '',
      amount numeric NOT NULL,
      user_name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_id text`;
  await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_name text`;
  await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'nuevo'`;
  await sql`UPDATE lead_conversations SET admin_status = 'nuevo' WHERE admin_status IS NULL`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz`;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_notes (
      id text PRIMARY KEY,
      conversation_id text NOT NULL,
      text text NOT NULL,
      author text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_lead_notes_conv
    ON lead_notes (conversation_id, created_at DESC)
  `;
}

export function ensureSchema(): Promise<void> {
  if (schemaReady) return Promise.resolve();
  const sql = getSql();
  if (!sql) return Promise.resolve();

  if (!schemaPromise) {
    schemaPromise = withDbRetry(() => runMigrations(sql))
      .then(() => {
        schemaReady = true;
      })
      .catch((err) => {
        schemaPromise = null;
        console.error("[ensureSchema]", err);
        throw err;
      });
  }
  return schemaPromise;
}

/** Comprueba conectividad — útil para diagnóstico. */
export async function pingDatabase(): Promise<{ ok: boolean; message: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, message: "DATABASE_URL no configurada." };
  try {
    await withDbRetry(async () => {
      await ensureSchema();
      await sql`SELECT 1 AS ok`;
    });
    return { ok: true, message: "Conexión OK." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión.";
    return { ok: false, message };
  }
}
