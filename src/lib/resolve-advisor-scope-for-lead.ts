import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { ensureSchema, getSql } from "@/server/db/client";

/**
 * Sesión asesora explícita, o asesora asignada al chat (p. ej. admin guardando gestión).
 */
export async function resolveAdvisorScopeForLeadSave(
  conversationId: string,
  scope?: AdvisorScope | null,
): Promise<AdvisorScope | null> {
  if (scope?.id) return scope;

  const advisorId = await getConversationRepository().getAssignedAdvisorId(conversationId);
  if (!advisorId) return null;

  await ensureSchema();
  const sql = getSql();
  if (!sql) return { id: advisorId, name: "" };

  const [userRow] = await sql<{ name: string }[]>`
    SELECT name FROM users WHERE id = ${advisorId} LIMIT 1
  `;
  const [convRow] = await sql<{ assigned_advisor_name: string | null }[]>`
    SELECT assigned_advisor_name FROM lead_conversations WHERE id = ${conversationId} LIMIT 1
  `;

  return {
    id: advisorId,
    name: userRow?.name ?? convRow?.assigned_advisor_name ?? "",
  };
}
