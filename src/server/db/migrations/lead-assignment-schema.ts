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
  // Conversaciones asignadas antes del deploy: inferir desde el primer inbound.
  await tx`
    UPDATE lead_conversations c
    SET assigned_advisor_at = fi.first_in
    FROM (
      SELECT c2.id,
        (
          SELECT min(m.created_at)
          FROM lead_messages m
          WHERE m.conversation_id = c2.id AND m.direction = 'in'
        ) AS first_in
      FROM lead_conversations c2
      WHERE c2.assigned_advisor_id IS NOT NULL
        AND c2.assigned_advisor_at IS NULL
    ) fi
    WHERE c.id = fi.id AND fi.first_in IS NOT NULL
  `;
}
