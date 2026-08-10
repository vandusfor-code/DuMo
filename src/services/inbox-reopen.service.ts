import "server-only";
import {
  ADVISOR_ONLINE_WINDOW_MINUTES,
  advisorReceivesLeads,
  isAdvisorPresenceStatus,
} from "@/lib/advisor-presence";
import {
  getConversationInboxState,
  getLastGestionAdvisor,
} from "@/repositories/inbox-lifecycle.repository";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";

export type InboxReopenResult =
  | { reopened: false; reason: "not-closed" | "no-tipifier" | "tipifier-unavailable" }
  | { reopened: true; advisorId: string; advisorName: string };

async function isAdvisorConnectedAndDisponible(advisorId: string): Promise<{
  id: string;
  name: string;
} | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<{ id: string; name: string; presence_status: string }[]>`
      SELECT id, name, presence_status
      FROM users
      WHERE id = ${advisorId}
        AND role = 'asesora'
        AND active = true
        AND presence_status = 'disponible'
        AND last_seen_at IS NOT NULL
        AND last_seen_at > now() - make_interval(mins => ${ADVISOR_ONLINE_WINDOW_MINUTES})
      LIMIT 1
    `,
  );

  const row = rows[0];
  if (!row) return null;
  const presence = row.presence_status;
  if (!isAdvisorPresenceStatus(presence) || !advisorReceivesLeads(presence)) return null;
  return { id: row.id, name: row.name };
}

async function reopenConversationToAdvisor(
  conversationId: string,
  advisor: { id: string; name: string },
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  await withDbRetry(() =>
    sql`
      UPDATE lead_conversations
      SET inbox_state = 'active',
          reopened_at = now(),
          assigned_advisor_id = ${advisor.id},
          assigned_advisor_name = ${advisor.name},
          assigned_advisor_at = now(),
          admin_status = 'asignado'
      WHERE id = ${conversationId}
    `,
  );
}

/**
 * P2.1 — Si el cliente escribe en conversación cerrada, reabrir y reasignar
 * al tipificador original cuando está conectada y disponible.
 */
export async function maybeReopenClosedConversationOnInbound(
  conversationId: string,
): Promise<InboxReopenResult> {
  const inboxState = await getConversationInboxState(conversationId);
  if (inboxState !== "closed") {
    return { reopened: false, reason: "not-closed" };
  }

  const tipifier = await getLastGestionAdvisor(conversationId);
  if (!tipifier) {
    return { reopened: false, reason: "no-tipifier" };
  }

  const advisor = await isAdvisorConnectedAndDisponible(tipifier.advisorId);
  if (!advisor) {
    return { reopened: false, reason: "tipifier-unavailable" };
  }

  await reopenConversationToAdvisor(conversationId, advisor);

  const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
  emitLeadsConversationUpdated({
    conversationId,
    assignedAdvisorId: advisor.id,
    reason: "reopen",
  });

  return { reopened: true, advisorId: advisor.id, advisorName: advisor.name };
}
