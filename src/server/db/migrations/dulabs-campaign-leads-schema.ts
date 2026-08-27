import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/**
 * Campos aditivos para recibir leads capturados por el bot de campañas de
 * WhatsApp de dulabs (POST /api/whatsapp/lead-intake). No se crea una tabla
 * nueva: estos leads son conversaciones normales en lead_conversations, con
 * el mismo id (dígitos del teléfono) que usaría un inbound real de
 * WhatsApp, para que se fusionen solas si el cliente escribe después.
 */
export const DULABS_CAMPAIGN_LEADS_REQUIRED_COLUMNS = [
  "lead_conversations.rut",
  "lead_conversations.source",
  "lead_conversations.campaign_id",
  "lead_conversations.campaign_name",
  "lead_conversations.current_operator",
  "lead_conversations.dulabs_session_id",
];

export async function runDulabsCampaignLeadsMigrations(tx: MigrationSql): Promise<void> {
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS rut text`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS source text`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS campaign_id text`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS campaign_name text`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS current_operator text`;
  await tx`ALTER TABLE lead_conversations ADD COLUMN IF NOT EXISTS dulabs_session_id text`;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_conversations_dulabs_session_id
    ON lead_conversations (dulabs_session_id)
    WHERE dulabs_session_id IS NOT NULL
  `;
}
