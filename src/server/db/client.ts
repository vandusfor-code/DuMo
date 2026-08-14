import "server-only";
import postgres, { type Sql } from "postgres";
import { SEED_ADMIN, seedAdminPasswordHash } from "@/lib/auth/seed-admin";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { QUICK_REPLY_REQUIRED_COLUMNS, runQuickReplyAndTenantMigrations } from "@/server/db/migrations/quick-reply-schema";
import { runTeleprompterScriptMigrations } from "@/server/db/migrations/teleprompter-scripts-schema";
import {
  ADVISOR_PRESENCE_REQUIRED_COLUMNS,
  runAdvisorPresenceMigrations,
} from "@/server/db/migrations/advisor-presence-schema";
import { runTipificationMigrations, runTipificationBehaviorMigrations, TIPIFICATION_REQUIRED_COLUMNS } from "@/server/db/migrations/tipifications-schema";
import { runTipificationP16Migrations } from "@/server/db/migrations/tipification-p16-schema";
import {
  runTipificationDuoMigrations,
  TIPIFICATION_DUO_REQUIRED_COLUMNS,
} from "@/server/db/migrations/tipification-duo-schema";
import { runTipificationNewLeadMigrations } from "@/server/db/migrations/tipification-new-lead-schema";
import {
  runDuoSalesMigrations,
  DUO_SALES_REQUIRED_COLUMNS,
} from "@/server/db/migrations/duo-sales-schema";
import {
  runDuoSalesCloseMigrations,
  DUO_SALES_CLOSE_REQUIRED_COLUMNS,
} from "@/server/db/migrations/duo-sales-close-schema";
import {
  runSalesReconciliationMigrations,
  SALES_RECONCILIATION_REQUIRED_COLUMNS,
} from "@/server/db/migrations/sales-reconciliation-schema";
import {
  runFolioNumberMigrations,
  FOLIO_NUMBER_REQUIRED_COLUMNS,
} from "@/server/db/migrations/folio-number-schema";
import {
  runResponseSlaMigrations,
  RESPONSE_SLA_REQUIRED_COLUMNS,
} from "@/server/db/migrations/response-sla-schema";
import { runWebQrMigrations } from "@/server/db/migrations/web-qr-schema";
import { runLeadAssignmentMigrations } from "@/server/db/migrations/lead-assignment-schema";
import {
  INBOX_LIFECYCLE_REQUIRED_COLUMNS,
  runInboxStateMigrations,
} from "@/server/db/migrations/inbox-lifecycle-schema";
import { runLeadFollowUpsMigrations } from "@/server/db/migrations/lead-follow-ups-schema";
import {
  DULABS_CAMPAIGN_LEADS_REQUIRED_COLUMNS,
  runDulabsCampaignLeadsMigrations,
} from "@/server/db/migrations/dulabs-campaign-leads-schema";
import {
  PCS_VALIDATION_REQUIRED_COLUMNS,
  runPcsValidationMigrations,
} from "@/server/db/migrations/pcs-validation-schema";

let sqlSingleton: Sql | null = null;
let schemaPromise: Promise<void> | null = null;
let schemaReady = false;

type MigrationSql = Sql | postgres.TransactionSql;

/**
 * DuMo usa Postgres directo (compatible con Supabase, Neon, Vercel Postgres).
 * En Vercel/Supabase la URI va en **DATABASE_URL1** (Transaction pooler, puerto 6543).
 * Las variables NEXT_PUBLIC_SUPABASE_* / ANON_KEY no son la conexión SQL.
 */
export function getDatabaseUrl(): string | null {
  const candidates = [
    process.env.DATABASE_URL1,
    process.env.DATABASE_URL,
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

  /** Avisos esperados de migraciones idempotentes (IF NOT EXISTS). No son errores. */
  const IGNORED_NOTICE_CODES = new Set(["42P07", "42701", "42P06"]);

  sqlSingleton = postgres(url, {
    ssl: isLocal ? false : "require",
    onnotice: (notice) => {
      const code = (notice as { code?: string }).code;
      if (code && IGNORED_NOTICE_CODES.has(code)) return;
      if (process.env.NODE_ENV === "development") {
        console.warn("[postgres notice]", notice);
      }
    },
    // Varias conexiones por instancia: la app hace consultas concurrentes
    // (polling de conversaciones + mensajes + markRead + perfil, más los
    // workers de BullMQ y los barridos periódicos). Con solo 3 conexiones
    // compartidas por TODO el proceso (único servidor persistente en
    // Railway, no serverless), cualquier ráfaga real de varias asesoras +
    // admin a la vez encolaba consultas hasta que alguna superaba el
    // timeout de 12s de las rutas — eso es "no se pudo cargar la bandeja"
    // intermitente reportado en producción. El servidor de Postgres actual
    // (Railway) reporta max_connections=100 y solo ~4 en uso en operación
    // normal, así que 3 era un límite autoimpuesto sin relación con la
    // capacidad real de la base — no con el pooler de Neon al que refería
    // el comentario original de esta constante, ya migrado.
    max: Number(process.env.DB_POOL_MAX ?? 15) || 15,
    idle_timeout: 20,
    connect_timeout: 15,
    max_lifetime: 60 * 5,
    // Pooler (Neon/Supabase) + serverless: sin prepared statements.
    prepare: false,
  });
  return sqlSingleton;
}

export function hasDatabase(): boolean {
  return Boolean(getDatabaseUrl());
}

/**
 * Migraciones DDL en el request path están deshabilitadas en producción.
 * Correr `npm run db:migrate` (o CI) antes/después de cada deploy.
 * En dev: ALLOW_RUNTIME_MIGRATIONS=1 para el comportamiento anterior.
 */
export function runtimeMigrationsEnabled(): boolean {
  if (process.env.ALLOW_RUNTIME_MIGRATIONS === "1") return true;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.SKIP_RUNTIME_MIGRATIONS !== "1";
}

/** Advierte si la URI apunta al puerto directo de Supabase (5432) en lugar del pooler (6543). */
export function inspectDatabaseUrlPooler(url: string | null): string[] {
  if (!url) return [];
  const problems: string[] = [];
  try {
    const u = new URL(url);
    const port = u.port || "5432";
    const isSupabasePooler = u.hostname.includes("pooler.supabase.com");
    const isSupabaseDirect = u.hostname.startsWith("db.") && u.hostname.endsWith(".supabase.co");
    if (isSupabaseDirect) {
      problems.push(
        "URI directa de Supabase (db.*.supabase.co). En serverless usa el Transaction pooler (puerto 6543).",
      );
    }
    if (isSupabasePooler && port === "5432") {
      problems.push("Pooler Supabase con puerto 5432 — usa 6543 (Transaction mode).");
    }
  } catch {
    /* ignore */
  }
  return problems;
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

/** Clave del advisory lock que serializa la migración entre instancias. */
const MIGRATION_LOCK_KEY = 828171;
const SCHEMA_COMPLETE_KEY = "schema_complete";

async function isSchemaMarkedComplete(sql: Sql): Promise<boolean> {
  try {
    const rows = await sql<{ value: unknown }[]>`
      SELECT value FROM app_config WHERE key = ${SCHEMA_COMPLETE_KEY} LIMIT 1
    `;
    const v = rows[0]?.value;
    return v === true || v === "true";
  } catch {
    return false;
  }
}

async function markSchemaComplete(sql: Sql): Promise<void> {
  try {
    await sql`
      INSERT INTO app_config (key, value)
      VALUES (${SCHEMA_COMPLETE_KEY}, 'true'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now()
    `;
  } catch {
    /* app_config puede no existir aún en BD vacía */
  }
}

/**
 * Huella del esquema: columnas que deben existir. Se comprueban con UNA
 * consulta barata en cada cold-start; si están todas, se salta el DDL. Si
 * falta cualquiera (p. ej. una columna nueva), la migración corre sola.
 *
 * Al añadir una columna nueva, agrégala aquí para que se autorrepare.
 */
const REQUIRED_COLUMNS = [
  "app_config.key",
  "users.last_seen_at",
  "users.monthly_sales_goal",
  ...ADVISOR_PRESENCE_REQUIRED_COLUMNS,
  "lead_conversations.dumo_phone_id",
  "lead_conversations.assigned_advisor_id",
  "lead_conversations.assigned_advisor_name",
  "lead_conversations.assigned_advisor_at",
  "lead_conversations.admin_status",
  "lead_conversations.last_message_direction",
  "lead_conversations.wa_chat_jid",
  ...INBOX_LIFECYCLE_REQUIRED_COLUMNS,
  "lead_messages.conversation_id",
  "connected_numbers.access_token",
  "lead_notes.conversation_id",
  "accounting_expenses.amount",
  "sales.advisor_id",
  "sale_lines.sale_id",
  "commission_payments.advisor_id",
  "lead_gestiones.conversation_id",
  "crm_clients.conversation_id",
  ...QUICK_REPLY_REQUIRED_COLUMNS,
  ...TIPIFICATION_REQUIRED_COLUMNS,
  ...TIPIFICATION_DUO_REQUIRED_COLUMNS,
  ...DUO_SALES_REQUIRED_COLUMNS,
  ...DUO_SALES_CLOSE_REQUIRED_COLUMNS,
  ...SALES_RECONCILIATION_REQUIRED_COLUMNS,
  ...FOLIO_NUMBER_REQUIRED_COLUMNS,
  ...RESPONSE_SLA_REQUIRED_COLUMNS,
  ...DULABS_CAMPAIGN_LEADS_REQUIRED_COLUMNS,
  ...PCS_VALIDATION_REQUIRED_COLUMNS,
];

/** ¿Está el esquema completo? Una sola consulta al catálogo. */
async function schemaIsComplete(sql: Sql): Promise<boolean> {
  try {
    const rows = (await sql`
      SELECT count(*)::int AS n
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name || '.' || column_name) = ANY(${REQUIRED_COLUMNS})
    `) as unknown as { n: number }[];
    return (rows[0]?.n ?? 0) >= REQUIRED_COLUMNS.length;
  } catch {
    return false;
  }
}

/** Crea offer_simulations sin correr el bloque DDL completo (no bloquea lead_conversations). */
async function ensureOfferSimulationsTable(sql: MigrationSql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS offer_simulations (
      id text PRIMARY KEY,
      lead_id text NOT NULL,
      company_id text NOT NULL DEFAULT 'company-default',
      created_by text NOT NULL,
      created_by_name text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      sale_type text NOT NULL,
      requested_lines integer NOT NULL,
      approved_lines integer NOT NULL,
      requested_equipment boolean NOT NULL DEFAULT false,
      approved_equipment boolean NOT NULL DEFAULT false,
      requested_plan_json jsonb NOT NULL DEFAULT '{}',
      approved_plan_json jsonb NOT NULL DEFAULT '{}',
      line_credit numeric NOT NULL DEFAULT 0,
      equipment_credit numeric NOT NULL DEFAULT 0,
      requested_total numeric NOT NULL DEFAULT 0,
      approved_total numeric NOT NULL DEFAULT 0,
      remaining_credit numeric NOT NULL DEFAULT 0,
      optimization_type text NOT NULL DEFAULT 'NONE',
      status text NOT NULL,
      recommendation text NOT NULL DEFAULT '',
      recommendation_json jsonb NOT NULL DEFAULT '{}'
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_offer_simulations_lead
    ON offer_simulations (lead_id, created_at DESC)
  `;
}

/** Tablas nuevas en prod ya marcada como schema_complete — sin migración pesada. */
async function ensureIncrementalMigrations(sql: Sql): Promise<void> {
  try {
    const rows = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'offer_simulations'
      ) AS exists
    `;
    if (!rows[0]?.exists) {
      await ensureOfferSimulationsTable(sql);
    }

    const teleprompterRows = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'teleprompter_script_overrides'
      ) AS exists
    `;
    if (!teleprompterRows[0]?.exists) {
      await runTeleprompterScriptMigrations(sql);
    }

    const webQrRows = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'whatsapp_channels'
      ) AS exists
    `;
    if (!webQrRows[0]?.exists) {
      await runWebQrMigrations(sql);
    }

    const tipificationRows = await sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'tipifications'
      ) AS exists
    `;
    if (!tipificationRows[0]?.exists) {
      await runTipificationMigrations(sql);
    }

    // Columnas añadidas después de marcar schema_complete — reparación idempotente.
    await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS wa_chat_jid text`;
    await sql`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS last_message_direction text DEFAULT 'in'`;
    await runAdvisorPresenceMigrations(sql);
    await runLeadAssignmentMigrations(sql);
    await runTipificationBehaviorMigrations(sql);
    await runTipificationP16Migrations(sql);
    await runTipificationDuoMigrations(sql);
    await runTipificationNewLeadMigrations(sql);
    await runDuoSalesMigrations(sql);
    await runDuoSalesCloseMigrations(sql);
    await runSalesReconciliationMigrations(sql);
    await runFolioNumberMigrations(sql);
    await runResponseSlaMigrations(sql);
    await runInboxStateMigrations(sql);

    await runLeadFollowUpsMigrations(sql);
    await runDulabsCampaignLeadsMigrations(sql);
    await runPcsValidationMigrations(sql);
  } catch (err) {
    console.error("[ensureIncrementalMigrations]", err);
  }
}

/**
 * Migraciones AUTORREPARABLES.
 *
 * Todo el DDL es idempotente (`IF NOT EXISTS`) y se ejecuta una vez por
 * cold-start, serializado con un advisory lock transaccional para que dos
 * instancias serverless nunca compitan.
 *
 * Antes existía un "candado por versión" que saltaba el DDL si la versión
 * coincidía: al añadir una columna sin subir ese número, el ALTER nunca corría
 * y la app fallaba con "column ... does not exist". Ahora no hay forma de que
 * el esquema quede desactualizado: si falta algo, se crea solo.
 */
async function runMigrations(sql: Sql) {
  await sql.begin(async (tx) => {
    const [{ locked }] = await tx<{ locked: boolean }[]>`
      SELECT pg_try_advisory_xact_lock(${MIGRATION_LOCK_KEY}) AS locked
    `;
    if (!locked) {
      console.info("[runMigrations] otra instancia está migrando — se omite en esta");
      return;
    }

    await tx`
      CREATE TABLE IF NOT EXISTS app_config (
        key text PRIMARY KEY,
        value jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;

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
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS assigned_advisor_at timestamptz`;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS admin_status text DEFAULT 'nuevo'`;
    await tx`UPDATE lead_conversations SET admin_status = 'nuevo' WHERE admin_status IS NULL`;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS last_message_direction text DEFAULT 'in'`;
    await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS wa_chat_jid text`;
    await runInboxStateMigrations(tx);
    await runLeadFollowUpsMigrations(tx);
    await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz`;
    await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_sales_goal integer`;
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
        dumo_value numeric NOT NULL DEFAULT 0,
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
    await tx`ALTER TABLE sales ADD COLUMN IF NOT EXISTS dumo_value numeric NOT NULL DEFAULT 0`;
    await tx`UPDATE sales SET dumo_value = operator_value WHERE dumo_value = 0 AND operator_value <> 0`;
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
        sales_script jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await tx`ALTER TABLE lead_gestiones ADD COLUMN IF NOT EXISTS sales_script jsonb`;

    await tx`
      CREATE TABLE IF NOT EXISTS crm_clients (
        id text PRIMARY KEY,
        conversation_id text NOT NULL,
        customer_name text NOT NULL DEFAULT '',
        rut text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        gestion_type text NOT NULL DEFAULT 'consulta',
        advisor_id text NOT NULL,
        advisor_name text NOT NULL DEFAULT '',
        has_sale boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (conversation_id, advisor_id)
      )
    `;
    await tx`
      CREATE INDEX IF NOT EXISTS idx_crm_clients_advisor ON crm_clients (advisor_id, updated_at DESC)
    `;

    await ensureOfferSimulationsTable(tx);

    await runQuickReplyAndTenantMigrations(tx);
    await runTipificationMigrations(tx);
    await runTipificationP16Migrations(tx);
    await runTipificationDuoMigrations(tx);
    await runTipificationNewLeadMigrations(tx);
    await runDuoSalesMigrations(tx);
    await runDuoSalesCloseMigrations(tx);
    await runSalesReconciliationMigrations(tx);
    await runFolioNumberMigrations(tx);
    await runResponseSlaMigrations(tx);
    await runAdvisorPresenceMigrations(tx);
    await runLeadAssignmentMigrations(tx);
    await runTeleprompterScriptMigrations(tx);
    await runWebQrMigrations(tx);
    await runDulabsCampaignLeadsMigrations(tx);
    await runPcsValidationMigrations(tx);

    await tx`
      INSERT INTO users (id, username, email, password_hash, name, role, active, avatar_url, company_id)
      VALUES (
        ${SEED_ADMIN.id},
        ${SEED_ADMIN.username},
        ${SEED_ADMIN.email},
        ${seedAdminPasswordHash()},
        ${SEED_ADMIN.name},
        ${SEED_ADMIN.role},
        true,
        ${SEED_ADMIN.avatarUrl},
        ${DEFAULT_COMPANY_ID}
      )
      ON CONFLICT (email) DO NOTHING
    `;

    await tx`
      INSERT INTO app_config (key, value)
      VALUES ('schema_migrated_at', ${JSON.stringify(new Date().toISOString())}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
    `;

    await tx`
      INSERT INTO app_config (key, value)
      VALUES (${SCHEMA_COMPLETE_KEY}, 'true'::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = 'true'::jsonb, updated_at = now()
    `;
  });
}

/** Fuerza re-ejecución de migraciones (p. ej. tras deploy con tablas nuevas). */
export function resetSchemaCache(): void {
  schemaReady = false;
  schemaPromise = null;
  authSchemaReady = false;
}

let authSchemaReady = false;

/** El login no ejecuta DDL — reservado solo por compatibilidad con imports existentes. */
export function ensureAuthSchema(): Promise<void> {
  if (authSchemaReady) return Promise.resolve();
  authSchemaReady = true;
  return Promise.resolve();
}

/** Ejecuta migraciones DDL completas — solo CI, deploy o `npm run db:migrate`. */
export async function migrateDatabaseSchema(): Promise<{ ok: boolean; message: string }> {
  const sql = getSql();
  if (!sql) {
    return { ok: false, message: "DATABASE_URL1 no configurada." };
  }

  schemaPromise = null;
  schemaReady = false;

  await withDbRetry(async () => {
    if (await isSchemaMarkedComplete(sql)) {
      await ensureIncrementalMigrations(sql);
      return;
    }
    if (await schemaIsComplete(sql)) {
      await markSchemaComplete(sql);
      return;
    }
    await runMigrations(sql);
    if (await schemaIsComplete(sql)) {
      await markSchemaComplete(sql);
    }
  }, 2);

  schemaReady = true;
  return { ok: true, message: "Migraciones aplicadas." };
}

export function ensureSchema(): Promise<void> {
  if (schemaReady) return Promise.resolve();
  const sql = getSql();
  if (!sql) return Promise.resolve();

  if (!runtimeMigrationsEnabled()) {
    // Producción sin ALLOW_RUNTIME_MIGRATIONS: por diseño no corre DDL desde
    // el camino de request (confía en `npm run db:migrate` en el deploy).
    // Antes marcaba el esquema como listo sin comprobar nada — igual que el
    // bug de ensureSchemaForRead. Ahora sí verifica (misma consulta barata)
    // y, si falta algo, lo deja bien visible en los logs en vez de fallar
    // en silencio: alguien tiene que correr la migración de deploy.
    schemaPromise = schemaIsComplete(sql)
      .then((complete) => {
        if (!complete) {
          console.error(
            "[ensureSchema] ALERTA: el esquema está incompleto en producción y las " +
              "migraciones de runtime están deshabilitadas. Corre `npm run db:migrate` " +
              "(o el paso de deploy equivalente) — algunas funciones pueden fallar hasta " +
              "entonces.",
          );
        }
        schemaReady = true;
      })
      .catch((err) => {
        console.error("[ensureSchema] no se pudo verificar el esquema", err);
        schemaReady = true;
      });
    return schemaPromise;
  }

  if (!schemaPromise) {
    schemaPromise = withQueryTimeout(
      withDbRetry(async () => {
        const result = await migrateDatabaseSchema();
        if (!result.ok) throw new Error(result.message);
      }, 1),
      45_000,
    )
      .then(() => {
        schemaReady = true;
      })
      .catch((err) => {
        schemaPromise = null;
        schemaReady = false;
        console.error("[ensureSchema]", err);
        throw err;
      });
  }
  return schemaPromise;
}

/**
 * Memoiza la verificación real de ensureSchemaForRead (separada de
 * schemaPromise/schemaReady) para no repetir la consulta al catálogo en
 * cada lectura una vez confirmado que el esquema está completo.
 */
let readSchemaCheckPromise: Promise<void> | null = null;

/**
 * Bandeja y lecturas: no ejecuta DDL directamente, pero YA NO asume que el
 * esquema está completo — lo verifica con la misma consulta barata que usa
 * el camino de escritura (schemaIsComplete). Antes marcaba `schemaReady =
 * true` sin comprobar nada; si esta función corría antes que ensureSchema()
 * en un proceso, "envenenaba" el flag compartido y ninguna migración volvía
 * a intentarse en ese proceso, aunque faltaran tablas o columnas reales
 * (así fue como duo_sales/commission_extras y el flag opens_custom_form
 * quedaron sin aplicar en producción sin que nada lo señalara).
 *
 * Si detecta que el esquema NO está completo, deja constancia con un log
 * bien visible (para que se note de inmediato, no en un try/catch mudo) y
 * delega en ensureSchema() para que se aplique lo que corresponda según el
 * entorno (en runtime habilitado, corre las migraciones; en producción sin
 * ALLOW_RUNTIME_MIGRATIONS, seguirá confiando en el deploy/CI, pero ahora
 * quedará registrado que el esquema estaba incompleto en ese momento).
 */
export function ensureSchemaForRead(): Promise<void> {
  if (schemaReady) return Promise.resolve();
  const sql = getSql();
  if (!sql) {
    schemaReady = true;
    return Promise.resolve();
  }

  if (!readSchemaCheckPromise) {
    readSchemaCheckPromise = schemaIsComplete(sql)
      .then((complete) => {
        if (complete) {
          schemaReady = true;
          return;
        }
        console.error(
          "[ensureSchemaForRead] ALERTA: el esquema está incompleto (faltan " +
            "columnas/tablas requeridas) pero se llegó por un camino de solo " +
            "lectura que antes lo daba por bueno sin comprobarlo. Delegando en " +
            "ensureSchema() — revisa si faltó aplicar `npm run db:migrate` tras " +
            "el último deploy.",
        );
        // Permite reintentar la verificación en la próxima lectura (p. ej. si
        // alguien corre la migración de deploy mientras el proceso sigue vivo).
        readSchemaCheckPromise = null;
        return ensureSchema();
      })
      .catch((err) => {
        readSchemaCheckPromise = null;
        console.error("[ensureSchemaForRead] no se pudo verificar el esquema", err);
        // Un fallo puntual de la consulta de verificación no debe bloquear la
        // bandeja/lecturas — se mantiene el comportamiento previo en ese caso.
        schemaReady = true;
      });
  }
  return readSchemaCheckPromise;
}

export async function pingDatabase(): Promise<{ ok: boolean; message: string }> {
  const url = getDatabaseUrl();
  if (!url) {
    return {
      ok: false,
      message:
        "DATABASE_URL1 no configurada. En Supabase: Project Settings → Database → Transaction pooler → copia la URI y ponla en DATABASE_URL1 (Vercel).",
    };
  }
  try {
    const sql = getSql();
    if (!sql) throw new Error("Cliente SQL no disponible.");
    await withQueryTimeout(withDbRetry(() => sql`SELECT 1 AS ok`, 1), 5_000);
    return { ok: true, message: "Conexión OK." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión.";
    return { ok: false, message };
  }
}
