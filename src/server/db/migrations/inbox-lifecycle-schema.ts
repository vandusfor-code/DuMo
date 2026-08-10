import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const INBOX_LIFECYCLE_REQUIRED_COLUMNS = [
  "lead_conversations.inbox_state",
  "lead_gestiones.follow_up_date",
] as const;

/** P1.2 — estado de bandeja por conversación. */
export async function runInboxStateMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    ALTER TABLE lead_conversations
    ADD COLUMN IF NOT EXISTS inbox_state text NOT NULL DEFAULT 'active'
  `;

  await tx`
    UPDATE lead_conversations
    SET inbox_state = 'active'
    WHERE inbox_state IS NULL OR inbox_state = ''
  `;

  await tx`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'lead_conversations_inbox_state_check'
      ) THEN
        ALTER TABLE lead_conversations ADD CONSTRAINT lead_conversations_inbox_state_check
          CHECK (inbox_state IN ('active', 'closed'));
      END IF;
    END $$
  `;

  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_conversations_inbox_active
    ON lead_conversations (assigned_advisor_id, inbox_state, last_message_at DESC)
    WHERE inbox_state = 'active' AND assigned_advisor_id IS NOT NULL
  `;

  await tx`
    ALTER TABLE lead_gestiones
    ADD COLUMN IF NOT EXISTS follow_up_date date
  `;
}
