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

export type InboxReopenAssignVia = "original-tipifier" | "round-robin" | "pending";

export type InboxReopenResult =
  | { reopened: false; reason: "not-closed" }
  | {
      reopened: true;
      advisorId: string | null;
      advisorName: string | null;
      assignVia: InboxReopenAssignVia;
    };

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

export async function reopenConversationToAdvisor(
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

/** P2.2 — Reabre dejando sin asesora para que round-robin asigne o quede pendiente. */
async function reopenUnassigned(conversationId: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  await withDbRetry(() =>
    sql`
      UPDATE lead_conversations
      SET inbox_state = 'active',
          reopened_at = now(),
          assigned_advisor_id = NULL,
          assigned_advisor_name = NULL,
          assigned_advisor_at = NULL,
          admin_status = 'nuevo'
      WHERE id = ${conversationId}
    `,
  );
}

async function getConversationAdvisor(
  conversationId: string,
): Promise<{ id: string; name: string } | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<{ assigned_advisor_id: string | null; assigned_advisor_name: string | null }[]>`
      SELECT assigned_advisor_id, assigned_advisor_name
      FROM lead_conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `,
  );
  const id = rows[0]?.assigned_advisor_id;
  if (!id) return null;
  return { id, name: rows[0]?.assigned_advisor_name ?? "" };
}

async function emitReopen(conversationId: string, assignedAdvisorId: string | null): Promise<void> {
  const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
  emitLeadsConversationUpdated({
    conversationId,
    assignedAdvisorId,
    reason: "reopen",
  });
}

/**
 * P2.1 + P2.2 — Inbound en conversación cerrada:
 * 1) tipificador original disponible → reasignar a ella;
 * 2) si no → round-robin a otra asesora disponible;
 * 3) si nadie disponible → reabrir sin asesora (pendiente hasta auto-assign).
 */
export async function maybeReopenClosedConversationOnInbound(
  conversationId: string,
): Promise<InboxReopenResult> {
  const inboxState = await getConversationInboxState(conversationId);
  if (inboxState !== "closed") {
    return { reopened: false, reason: "not-closed" };
  }

  const tipifier = await getLastGestionAdvisor(conversationId);
  if (tipifier) {
    const original = await isAdvisorConnectedAndDisponible(tipifier.advisorId);
    if (original) {
      await reopenConversationToAdvisor(conversationId, original);
      await emitReopen(conversationId, original.id);
      return {
        reopened: true,
        advisorId: original.id,
        advisorName: original.name,
        assignVia: "original-tipifier",
      };
    }
  }

  await reopenUnassigned(conversationId);

  const { adminLeadsService } = await import("@/services/admin-leads.service");
  await adminLeadsService.autoAssignIfNeeded(conversationId);

  const assigned = await getConversationAdvisor(conversationId);
  if (assigned) {
    await emitReopen(conversationId, assigned.id);
    return {
      reopened: true,
      advisorId: assigned.id,
      advisorName: assigned.name,
      assignVia: "round-robin",
    };
  }

  await emitReopen(conversationId, null);
  return {
    reopened: true,
    advisorId: null,
    advisorName: null,
    assignVia: "pending",
  };
}
