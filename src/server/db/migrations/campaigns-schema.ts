import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/**
 * Módulo Campañas — mensajería masiva controlada. Reutiliza lead_conversations
 * tal cual (campaign_id/campaign_name/source ya existen, ver
 * dulabs-campaign-leads-schema.ts) en vez de duplicar el concepto de
 * "contacto": el envío de una campaña crea/actualiza la MISMA conversación
 * que usaría un inbound real (mismo id = dígitos normalizados del teléfono),
 * así una respuesta futura por cualquier canal cae sola ahí.
 */
export const CAMPAIGNS_REQUIRED_COLUMNS = [
  "campaigns.id",
  "campaign_contacts.id",
  "campaign_events.id",
  "campaign_suppressions.id",
] as const;

export async function runCampaignsMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS campaigns (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      name text NOT NULL,
      description text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'BORRADOR',
      message_template text NOT NULL DEFAULT '',
      provider text NOT NULL DEFAULT 'mock',
      interval_seconds integer NOT NULL DEFAULT 60,
      concurrency integer NOT NULL DEFAULT 1,
      max_retries integer NOT NULL DEFAULT 0,
      total_contacts integer NOT NULL DEFAULT 0,
      eligible_contacts integer NOT NULL DEFAULT 0,
      sent_count integer NOT NULL DEFAULT 0,
      failed_count integer NOT NULL DEFAULT 0,
      excluded_count integer NOT NULL DEFAULT 0,
      response_count integer NOT NULL DEFAULT 0,
      opt_out_count integer NOT NULL DEFAULT 0,
      risk_status text NOT NULL DEFAULT 'ok',
      risk_reason text,
      consecutive_failures integer NOT NULL DEFAULT 0,
      current_job_id text,
      created_by text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      started_at timestamptz,
      paused_at timestamptz,
      finished_at timestamptz
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_campaigns_company_status
    ON campaigns (company_id, status)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS campaign_contacts (
      id text PRIMARY KEY,
      campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      company_id text NOT NULL REFERENCES companies(id),
      raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
      name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      phone_raw text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'PENDING',
      attempts integer NOT NULL DEFAULT 0,
      provider_message_id text,
      error text,
      conversation_id text,
      locked_at timestamptz,
      sent_at timestamptz,
      response_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_contacts_campaign_phone
    ON campaign_contacts (campaign_id, phone)
    WHERE phone <> ''
  `;
  // Claim atómico del worker: WHERE campaign_id=$1 AND status='PENDING' ORDER BY created_at.
  await tx`
    CREATE INDEX IF NOT EXISTS idx_campaign_contacts_claim
    ON campaign_contacts (campaign_id, status, created_at)
  `;
  // Detección de PROCESSING atascados (locked_at viejo).
  await tx`
    CREATE INDEX IF NOT EXISTS idx_campaign_contacts_stale
    ON campaign_contacts (status, locked_at)
    WHERE status = 'PROCESSING'
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS campaign_events (
      id text PRIMARY KEY,
      campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      campaign_contact_id text REFERENCES campaign_contacts(id) ON DELETE SET NULL,
      event_type text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign
    ON campaign_events (campaign_id, created_at DESC)
  `;

  await tx`
    CREATE TABLE IF NOT EXISTS campaign_suppressions (
      id text PRIMARY KEY,
      company_id text NOT NULL REFERENCES companies(id),
      phone text NOT NULL,
      reason text NOT NULL DEFAULT '',
      source text NOT NULL DEFAULT 'manual',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await tx`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_suppressions_company_phone
    ON campaign_suppressions (company_id, phone)
  `;
}
