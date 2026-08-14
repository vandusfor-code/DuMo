import "server-only";
import type postgres from "postgres";

type MigrationSql = postgres.Sql | postgres.TransactionSql;

export const CONVERSATION_CURRENT_TIPIFICATION_REQUIRED_COLUMNS = [
  "lead_conversations.current_tipification_slug",
] as const;

/**
 * Tipificación visible en bandeja, independiente de lead_gestiones.
 * Cambiar el dropdown la escribe aquí; un mensaje nuevo no la borra.
 * Guardar y cerrar sigue creando la gestión y cierra la bandeja.
 */
export async function runConversationCurrentTipificationMigrations(
  tx: MigrationSql,
): Promise<void> {
  await tx`
    ALTER TABLE lead_conversations
    ADD COLUMN IF NOT EXISTS current_tipification_slug text
  `;

  await tx`
    UPDATE lead_conversations c
    SET current_tipification_slug = lg.gestion_type
    FROM (
      SELECT DISTINCT ON (conversation_id) conversation_id, gestion_type
      FROM lead_gestiones
      ORDER BY conversation_id, created_at DESC
    ) lg
    WHERE c.id = lg.conversation_id
      AND (c.current_tipification_slug IS NULL OR c.current_tipification_slug = '')
  `;
}
