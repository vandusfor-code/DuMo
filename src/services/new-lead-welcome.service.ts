import "server-only";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";
import { buildNewLeadWelcomeMessages } from "@/lib/new-lead-welcome";
import { isWebQrConversation } from "@/lib/web-qr/conversation-id";
import { ensureSchema, getSql } from "@/server/db/client";
import { leadsService } from "@/services/leads.service";

const WELCOME_LOCK_NS = 8_814_201;

/**
 * Primer contacto WhatsApp (orgánico o DuLabs): dos burbujas, en orden,
 * con el nombre de la asesora ya asignada. No corre en Messenger/QR,
 * reaperturas, chats que ya tenían asesora, ni si ya hubo un saliente.
 * Errores de envío se registran y no se relanzan.
 */
export async function maybeSendNewLeadWelcome(conversationId: string): Promise<void> {
  if (!conversationId) return;
  if (isMessengerConversation(conversationId) || isWebQrConversation(conversationId)) return;

  await ensureSchema();
  const sql = getSql();
  if (!sql) return;

  try {
    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${WELCOME_LOCK_NS}, hashtext(${conversationId}))`;

      const conv = await tx<
        { phone: string; assigned_advisor_id: string | null; assigned_advisor_name: string | null }[]
      >`
        SELECT phone, assigned_advisor_id, assigned_advisor_name
        FROM lead_conversations
        WHERE id = ${conversationId}
        LIMIT 1
      `;
      const row = conv[0];
      if (!row?.assigned_advisor_id || !row.assigned_advisor_name?.trim()) return;

      const counts = await tx<{ inbound: number; outbound: number }[]>`
        SELECT
          count(*) FILTER (WHERE direction = 'in')::int AS inbound,
          count(*) FILTER (WHERE direction = 'out')::int AS outbound
        FROM lead_messages
        WHERE conversation_id = ${conversationId}
      `;
      const inbound = counts[0]?.inbound ?? 0;
      const outbound = counts[0]?.outbound ?? 0;
      if (outbound !== 0 || inbound < 1 || inbound > 2) return;

      const [first, second] = buildNewLeadWelcomeMessages(row.assigned_advisor_name);
      const to = row.phone?.trim() || conversationId;

      await leadsService.sendTextMessage({ conversationId, to, text: first });
      await leadsService.sendTextMessage({ conversationId, to, text: second });
    });
  } catch (err) {
    console.error("[maybeSendNewLeadWelcome]", err);
  }
}
