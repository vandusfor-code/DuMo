import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Cliente Postgres (Neon serverless, por HTTP) para el chat de Leads.
 * Es server-only. Si falta DATABASE_URL, `getSql()` devuelve null y la capa de
 * conversaciones cae automáticamente al MockRepository.
 */

let sqlSingleton: NeonQueryFunction<false, false> | null = null;
let schemaPromise: Promise<void> | null = null;

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

/**
 * Crea las tablas del chat si no existen. Cacheado por runtime (una sola vez
 * por cold start; idempotente igual).
 */
export function ensureSchema(): Promise<void> {
  const sql = getSql();
  if (!sql) return Promise.resolve();
  if (!schemaPromise) {
    schemaPromise = (async () => {
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
      // Número de DuMo por el que entró/sale la conversación (multi-número).
      await sql`
        ALTER TABLE lead_conversations
        ADD COLUMN IF NOT EXISTS dumo_phone_id text
      `;
      // Números conectados a DuMo (los que "Conectar con DuMo" registra).
      await sql`
        CREATE TABLE IF NOT EXISTS connected_numbers (
          phone_number_id text PRIMARY KEY,
          display_phone text NOT NULL DEFAULT '',
          waba_id text NOT NULL DEFAULT '',
          label text NOT NULL DEFAULT '',
          connected_at timestamptz NOT NULL DEFAULT now()
        )
      `;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}
