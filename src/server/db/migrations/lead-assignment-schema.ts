import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

/** Timestamp de cuándo se asignó la conversación a la asesora actual. */
export async function runLeadAssignmentMigrations(tx: MigrationSql): Promise<void> {
  await tx`
    ALTER TABLE lead_conversations
    ADD COLUMN IF NOT EXISTS assigned_advisor_at timestamptz
  `;
  await tx`
    CREATE INDEX IF NOT EXISTS idx_lead_conversations_assigned_advisor_at
    ON lead_conversations (assigned_advisor_id, assigned_advisor_at DESC NULLS LAST)
    WHERE assigned_advisor_id IS NOT NULL
  `;
}
