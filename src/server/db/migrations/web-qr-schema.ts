import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/** Columnas que deben existir para el módulo QR (aislado de WABA). */
export const WEB_QR_REQUIRED_COLUMNS = [
  "whatsapp_channels.id",
  "whatsapp_channels.channel_type",
  "web_qr_sessions.channel_id",
] as const;

/**
 * Canales de WhatsApp con tipo polimórfico.
 * WABA: reservado para futura unificación; hoy sigue en `connected_numbers`.
 * WEB_QR: sesiones Baileys / WhatsApp Web.
 */
export async function runWebQrMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS whatsapp_channels (
      id text PRIMARY KEY,
      company_id text NOT NULL DEFAULT 'company-default',
      phone_number text NOT NULL,
      label text NOT NULL DEFAULT '',
      channel_type text NOT NULL CHECK (channel_type IN ('WABA', 'WEB_QR')),
      status text NOT NULL DEFAULT 'DISCONNECTED'
        CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'INITIALIZING')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_whatsapp_channels_company
    ON whatsapp_channels (company_id, channel_type)
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_channels_phone_type
    ON whatsapp_channels (company_id, phone_number, channel_type)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS web_qr_sessions (
      id text PRIMARY KEY,
      channel_id text NOT NULL UNIQUE REFERENCES whatsapp_channels(id) ON DELETE CASCADE,
      session_data jsonb NOT NULL DEFAULT '{}',
      browser_user_agent text NOT NULL DEFAULT '',
      bridge_session_id text,
      last_reconnect_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}
