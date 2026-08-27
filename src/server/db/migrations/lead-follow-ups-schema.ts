import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const LEAD_FOLLOW_UPS_TABLE = "lead_follow_ups" as const;

/** P4.0 — cola de seguimientos (pendientes) derivada de gestiones tipificadas. */
export async function runLeadFollowUpsMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    CREATE TABLE IF NOT EXISTS lead_follow_ups (
      id text PRIMARY KEY,
      company_id text NOT NULL DEFAULT 'company-default',
      gestion_id text NOT NULL UNIQUE,
      conversation_id text NOT NULL,
      advisor_id text,
      advisor_name text NOT NULL DEFAULT '',
      customer_name text NOT NULL DEFAULT '',
      phone text NOT NULL DEFAULT '',
      tipification_slug text NOT NULL,
      follow_up_date date NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz,
      origin_advisor_id text,
      owner_advisor_id text,
      module text NOT NULL DEFAULT 'pendientes'
    )
  `;

  await tx`ALTER TABLE lead_follow_ups ADD COLUMN IF NOT EXISTS origin_advisor_id text`;
  await tx`ALTER TABLE lead_follow_ups ADD COLUMN IF NOT EXISTS owner_advisor_id text`;
  await tx`ALTER TABLE lead_follow_ups ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'pendientes'`;

  await tx`
    UPDATE lead_follow_ups
    SET origin_advisor_id = advisor_id
    WHERE origin_advisor_id IS NULL AND advisor_id IS NOT NULL
  `;

  await tx`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lead_follow_ups_status_check'
      ) THEN
        ALTER TABLE lead_follow_ups DROP CONSTRAINT lead_follow_ups_status_check;
      END IF;
      ALTER TABLE lead_follow_ups ADD CONSTRAINT lead_follow_ups_status_check
        CHECK (status IN ('pending', 'completed', 'cancelled', 'transferred'));
    END $$
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lead_follow_ups_module_check'
      ) THEN
        ALTER TABLE lead_follow_ups ADD CONSTRAINT lead_follow_ups_module_check
          CHECK (module IN ('pendientes', 'recuperacion'));
      END IF;
    END $$
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_date_status
    ON lead_follow_ups (follow_up_date, status)
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_advisor_date
    ON lead_follow_ups (advisor_id, follow_up_date)
    WHERE status = 'pending'
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_follow_ups_conversation
    ON lead_follow_ups (conversation_id, created_at DESC)
  `;
}
