import "server-only";
import type { InboxState } from "@/types/inbox-state";
import { ensureSchema, getSql, withDbRetry } from "@/server/db/client";

export type InboxLifecycleApplyResult = {
  inboxClosed: boolean;
  inboxState: InboxState;
  followUpDate: string | null;
  followUpCreated: boolean;
};

export async function setConversationInboxState(
  conversationId: string,
  inboxState: InboxState,
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  await withDbRetry(() =>
    sql`
      UPDATE lead_conversations
      SET inbox_state = ${inboxState}
      WHERE id = ${conversationId}
    `,
  );
}

export async function setGestionFollowUpDate(
  gestionId: string,
  followUpDate: string | null,
): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) throw new Error("Base de datos no configurada");

  await withDbRetry(() =>
    sql`
      UPDATE lead_gestiones
      SET follow_up_date = ${followUpDate}
      WHERE id = ${gestionId}
    `,
  );
}

export async function getConversationInboxState(conversationId: string): Promise<InboxState | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<{ inbox_state: string }[]>`
      SELECT inbox_state
      FROM lead_conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `,
  );

  const raw = rows[0]?.inbox_state;
  return raw === "closed" ? "closed" : raw === "active" ? "active" : null;
}

export type LastGestionAdvisor = {
  advisorId: string;
  advisorName: string;
};

/** Última gestión con asesora registrada (tipificador original). */
export async function getLastGestionAdvisor(
  conversationId: string,
): Promise<LastGestionAdvisor | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<{ advisor_id: string; advisor_name: string }[]>`
      SELECT advisor_id, advisor_name
      FROM lead_gestiones
      WHERE conversation_id = ${conversationId}
        AND advisor_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
  );

  const row = rows[0];
  if (!row?.advisor_id) return null;
  return { advisorId: row.advisor_id, advisorName: row.advisor_name ?? "" };
}

export async function getGestionFollowUpDate(gestionId: string): Promise<string | null> {
  await ensureSchema();
  const sql = getSql();
  if (!sql) return null;

  const rows = await withDbRetry(() =>
    sql<{ follow_up_date: string | null }[]>`
      SELECT follow_up_date::text AS follow_up_date
      FROM lead_gestiones
      WHERE id = ${gestionId}
      LIMIT 1
    `,
  );

  const raw = rows[0]?.follow_up_date;
  if (!raw) return null;
  return raw.slice(0, 10);
}
