import "server-only";
import postgres, { type Sql } from "postgres";

let sqlSingleton: Sql | null = null;
let schemaPromise: Promise<void> | null = null;
let schemaReady = false;

/**
 * DuMo usa Postgres directo (compatible con Supabase, Neon, Vercel Postgres).
 * Supabase: usa la URI del **Transaction pooler** (puerto 6543) en DATABASE_URL.
 * Las variables NEXT_PUBLIC_SUPABASE_* / ANON_KEY no son la conexión SQL.
 */
export function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_URL1,
    process.env.SUPABASE_DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function getSql(): Sql | null {
  if (sqlSingleton) return sqlSingleton;
  const url = getDatabaseUrl();
  if (!url) return null;

  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");

  sqlSingleton = postgres(url, {
    ssl: isLocal ? false : "require",
    max: 1,
    idle_timeout: 10,
    connect_timeout: 15,
    max_lifetime: 60 * 5,
    // Supabase pooler y serverless: sin prepared statements.
    prepare: false,
  });
  return sqlSingleton;
}

export function hasDatabase(): boolean {
  return Boolean(getDatabaseUrl());
}

/** Reintenta consultas ante timeouts transitorios en serverless. */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

/** Evita que consultas colgadas dejen la UI en skeleton eterno. */
export async function withQueryTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Query timeout (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Versión del esquema. Súbela al agregar/alterar tablas para que la migración
 * vuelva a correr una vez. Si no cambia, los cold-starts saltan todo el DDL.
 */
const SCHEMA_VERSION = 1;
/** Clave del advisory lock que serializa la migración entre instancias. */
const MIGRATION_LOCK_KEY = 828171;

/**
 * Ejecuta las migraciones DDL UNA sola vez, serializadas entre todas las
 * instancias serverless con un advisory lock transaccional. Tras la primera
 * migración, cada cold-start solo lee la versión y sale (sin DDL), lo que
 * elimina las carreras de CREATE/ALTER que causaban fallos intermitentes.
 */
async function runMigrations(sql: Sql) {
  await sql.begin(async (tx) => {
    // Serializa: solo una instancia corre el DDL a la vez; las demás esperan.
    await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`;

    await tx`
      CREATE TABLE IF NOT EXISTS app_config (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    const versionRows = await tx`SELECT value FROM app_config WHERE key = 'schema_version'`;
    const current = versionRows[0]?.value != null ? Number(versionRows[0].value) : 0;
    if (current >= SCHEMA_VERSION) return; // ya migrado: nada de DDL

    await tx`
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
    await tx`
      CREATE TABLE IF NOT EXISTS lead_messages (
        id text PRIMARY KEY,
        conversation_id text NOT NULL,
        direction text NOT NULL,
        body text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        read boolean NOT NULL DEFAULT false
      )
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS idx_lead_messages_conv
      ON lead_messages (conversation_id, created_at)
    `;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS dumo_phone_id text`;
    await tx`
      CREATE TABLE IF NOT EXISTS connected_numbers (
        phone_number_id text PRIMARY KEY,
        display_phone text NOT NULL DEFAULT '',
        waba_id text NOT NULL DEFAULT '',
        label text NOT NULL DEFAULT '',
        connected_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`ALTER TABLE connected_numbers ADD COLUMN IF NOT EXISTS access_token text`;
    await tx`
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
    await tx`
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
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_id text`;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_name text`;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'nuevo'`;
    await tx`UPDATE lead_conversations SET admin_status = 'nuevo' WHERE admin_status IS NULL`;
    await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz`;
    await tx`
      CREATE TABLE IF NOT EXISTS lead_notes (
        id text PRIMARY KEY,
        conversation_id text NOT NULL,
        text text NOT NULL,
        author text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS idx_lead_notes_conv
      ON lead_notes (conversation_id, created_at DESC)
    `;
    await tx`
      CREATE TABLE IF NOT EXISTS sales (
        id text PRIMARY KEY,
        customer_name text NOT NULL,
        rut text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        email text NOT NULL DEFAULT '',
        advisor_id text,
        advisor_name text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'registrada',
        sale_type text NOT NULL DEFAULT 'portabilidad',
        plan text NOT NULL DEFAULT '',
        operator_value numeric NOT NULL DEFAULT 0,
        sale_date date NOT NULL DEFAULT CURRENT_DATE,
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`
      CREATE TABLE IF NOT EXISTS sale_lines (
        id text PRIMARY KEY,
        sale_id text NOT NULL,
        phone_number text NOT NULL DEFAULT '',
        sale_type text NOT NULL DEFAULT 'portability',
        device_name text NOT NULL DEFAULT '',
        plan_id text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'pending'
      )
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS idx_sale_lines_sale ON sale_lines (sale_id)
    `;
    await tx`
      CREATE TABLE IF NOT EXISTS commission_payments (
        id text PRIMARY KEY,
        advisor_id text NOT NULL,
        period_month int NOT NULL,
        period_year int NOT NULL,
        amount numeric NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'pending',
        paid_at timestamptz,
        note text NOT NULL DEFAULT '',
        UNIQUE (advisor_id, period_month, period_year)
      )
    `;
    await tx`
      CREATE TABLE IF NOT EXISTS lead_gestiones (
        id text PRIMARY KEY,
        conversation_id text NOT NULL,
        phone text NOT NULL,
        customer_name text NOT NULL DEFAULT '',
        rut text NOT NULL DEFAULT '',
        gestion_type text NOT NULL,
        notes text NOT NULL DEFAULT '',
        advisor_id text,
        advisor_name text NOT NULL DEFAULT '',
        lines jsonb NOT NULL DEFAULT '[]',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await tx`
      INSERT INTO app_config (key, value)
      VALUES ('schema_version', ${String(SCHEMA_VERSION)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;
  });
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

export async function pingDatabase(): Promise<{ ok: boolean; message: string }> {
  const url = getDatabaseUrl();
  if (!url) {
    return {
      ok: false,
      message:
        "DATABASE_URL no configurada. En Supabase: Project Settings → Database → Transaction pooler → copia la URI y ponla en DATABASE_URL.",
    };
  }
  try {
    await withDbRetry(async () => {
      await ensureSchema();
      const sql = getSql()!;
      await sql`SELECT 1 AS ok`;
    });
    return { ok: true, message: "Conexión OK." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión.";
    return { ok: false, message };
  }
}
