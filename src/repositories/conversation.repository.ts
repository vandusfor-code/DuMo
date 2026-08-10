import "server-only";
import type { ChatMessage, Conversation, ConversationStatus } from "@/types/conversation";
import { CONVERSATIONS_MOCK, getMockMessages } from "@/data/mock/leads.mock";
import { withLatency } from "@/lib/mock";
import { formatChatTime } from "@/lib/format";
import { resolveConversationChannel } from "@/lib/conversation-channel";
import { parseInboxState } from "@/types/inbox-state";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";
import { isWebQrConversation, webQrConversationId } from "@/lib/web-qr/conversation-id";
import { formatWhatsAppDisplayPhone, isLikelyWhatsAppLid, normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { ensureSchema, ensureSchemaForRead, getSql, hasDatabase, withDbRetry, withQueryTimeout } from "@/server/db/client";

/** Un mensaje entrante/saliente a persistir. */
export interface IncomingMessage {
  waMessageId: string;
  conversationId: string; // wa_id del cliente
  phone: string;
  customerName: string;
  body: string;
  direction: "in" | "out";
  createdAt: string; // ISO
  /** Número de DuMo (phone_number_id) por el que entró el mensaje. */
  dumoPhoneId?: string;
  messageType?: "text" | "image" | "audio";
  mediaAssetId?: string;
  mediaUrl?: string;
  caption?: string;
  /** JID de WhatsApp Web para responder (solo canal WEB_QR). */
  waChatJid?: string;
  companyId?: string;
}

/** Un número conectado a DuMo (lo registra "Conectar con DuMo"). */
export interface ConnectedNumber {
  phoneNumberId: string;
  displayPhone: string;
  wabaId: string;
  label: string;
  /** Token permanente de Meta con acceso a ese número (como meta_permanent_token en dulabs). */
  accessToken?: string;
}

export interface ConversationRepository {
  getConversations(advisorId?: string): Promise<Conversation[]>;
  getMessages(conversationId: string): Promise<ChatMessage[]>;
  saveMessage(msg: IncomingMessage): Promise<void>;
  updateMessageBodyIfPlaceholder(waMessageId: string, body: string): Promise<boolean>;
  markRead(conversationId: string): Promise<void>;
  getAssignedAdvisorId(conversationId: string): Promise<string | null>;
  /** phone_number_id de DuMo por el que se debe responder esa conversación. */
  getSendFromPhoneId(conversationId: string): Promise<string | null>;
  getWaChatJid(conversationId: string): Promise<string | null>;
  findConversationIdByWaChatJid(waChatJid: string): Promise<string | null>;
  /** Busca conversación webqr existente por teléfono o JID (evita duplicar LID vs PN). */
  findWebQrConversationId(phoneDigits: string, waChatJid?: string): Promise<string | null>;
  /** Mueve mensajes de un hilo duplicado al canónico. */
  mergeWebQrConversations(targetId: string, duplicateId: string): Promise<void>;
  updateDumoPhoneId(conversationId: string, dumoPhoneId: string): Promise<void>;
  /** Token de envío registrado para un phone_number_id conectado. */
  getAccessTokenForPhoneId(phoneNumberId: string): Promise<string | null>;
  /** phone_number_id registrados como conectados a DuMo (números activos). */
  listConnectedPhoneIds(): Promise<string[]>;
  registerNumber(number: ConnectedNumber): Promise<void>;
}

/* ----------------------------- Mock ----------------------------- */

class MockConversationRepository implements ConversationRepository {
  getConversations(_advisorId?: string) {
    return withLatency(CONVERSATIONS_MOCK);
  }
  getMessages(conversationId: string) {
    return withLatency(getMockMessages(conversationId));
  }
  saveMessage() {
    return Promise.resolve();
  }
  updateMessageBodyIfPlaceholder() {
    return Promise.resolve(false);
  }
  markRead() {
    return Promise.resolve();
  }
  getAssignedAdvisorId() {
    return Promise.resolve(null);
  }
  getSendFromPhoneId() {
    return Promise.resolve(null);
  }
  getWaChatJid() {
    return Promise.resolve(null);
  }
  findConversationIdByWaChatJid() {
    return Promise.resolve(null);
  }
  findWebQrConversationId() {
    return Promise.resolve(null);
  }
  mergeWebQrConversations() {
    return Promise.resolve();
  }
  updateDumoPhoneId() {
    return Promise.resolve();
  }
  getAccessTokenForPhoneId() {
    return Promise.resolve(null);
  }
  listConnectedPhoneIds() {
    return Promise.resolve([] as string[]);
  }
  registerNumber() {
    return Promise.resolve();
  }
}

/* --------------------------- Postgres --------------------------- */

type ConvRow = {
  id: string;
  phone: string;
  customer_name: string;
  last_message: string;
  last_message_at: string;
  last_message_direction?: string;
  unread: number;
  status: string;
  online: boolean;
  inbox_state?: string;
};

type MsgRow = {
  id: string;
  conversation_id: string;
  direction: string;
  body: string;
  created_at: string | Date;
  read: boolean;
  message_type?: string;
  media_asset_id?: string | null;
  caption?: string | null;
  media_public_url?: string | null;
};

function isoTimestamp(value: string | Date): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toStatus(value: string): ConversationStatus {
  return (["new", "in_progress", "converted", "lost"] as string[]).includes(value)
    ? (value as ConversationStatus)
    : "new";
}

class PostgresConversationRepository implements ConversationRepository {
  async getConversations(advisorId?: string): Promise<Conversation[]> {
    await ensureSchemaForRead();
    const sql = getSql()!;
    const rows = await withQueryTimeout(
      withDbRetry(() =>
        advisorId
          ? sql`
              SELECT c.* FROM lead_conversations c
              WHERE c.assigned_advisor_id = ${advisorId}
                AND c.inbox_state = 'active'
                AND NOT EXISTS (
                  SELECT 1 FROM lead_follow_ups f
                  WHERE f.conversation_id = c.id
                    AND f.module = 'recuperacion'
                    AND f.status <> 'completed'
                )
              ORDER BY c.last_message_at DESC
            `
          : sql`
              SELECT * FROM lead_conversations ORDER BY last_message_at DESC
            `,
      ),
      8000,
    );
    return (rows as unknown as ConvRow[]).map((r) => {
      const formattedPhone = formatWhatsAppDisplayPhone(r.phone);
      const displayName =
        r.customer_name?.trim() ||
        formattedPhone ||
        (isWebQrConversation(r.id) && isLikelyWhatsAppLid(r.phone) ? "Contacto WhatsApp" : r.phone);
      return {
        id: r.id,
        customerName: displayName,
        phone: formattedPhone || r.phone,
        rut: "",
        channel: resolveConversationChannel(r.id),
        lastMessage: r.last_message,
        lastMessageTime: formatChatTime(r.last_message_at),
        lastMessageDirection: r.last_message_direction === "out" ? "out" : "in",
        unread: Number(r.unread) || 0,
        status: toStatus(r.status),
        online: Boolean(r.online),
        inboxState: parseInboxState(r.inbox_state),
      };
    });
  }

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    await ensureSchemaForRead();
    const sql = getSql()!;
    const rows = await withQueryTimeout(
      withDbRetry(() =>
        sql`
          SELECT m.id, m.conversation_id, m.direction, m.body, m.created_at, m.read,
                 m.message_type, m.media_asset_id, m.caption, a.public_url AS media_public_url
          FROM lead_messages m
          LEFT JOIN media_assets a ON a.id = m.media_asset_id
          WHERE m.conversation_id = ${conversationId}
          ORDER BY m.created_at ASC
        `,
      ),
      10_000,
    );
    return (rows as unknown as MsgRow[]).map((r) => {
      const isImage = r.message_type === "image" && Boolean(r.media_public_url);
      const isAudio = r.message_type === "audio" && Boolean(r.media_public_url);
      const mediaType = isImage ? "image" : isAudio ? "audio" : "text";
      return {
        id: r.id,
        conversationId: r.conversation_id,
        text: r.body ?? "",
        time: formatChatTime(isoTimestamp(r.created_at)),
        direction: r.direction === "out" ? "out" : "in",
        read: Boolean(r.read),
        messageType: mediaType,
        mediaUrl: isImage || isAudio ? (r.media_public_url ?? undefined) : undefined,
        caption: isImage ? (r.caption ?? undefined) : undefined,
        mediaAssetId: isImage || isAudio ? (r.media_asset_id ?? undefined) : undefined,
      };
    });
  }

  async saveMessage(msg: IncomingMessage): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    const incUnread = msg.direction === "in" ? 1 : 0;

    await sql`
      INSERT INTO lead_conversations
        (id, phone, customer_name, last_message, last_message_at, unread, status, online, dumo_phone_id, last_message_direction, wa_chat_jid)
      VALUES (
        ${msg.conversationId}, ${msg.phone}, ${msg.customerName},
        ${msg.body}, ${msg.createdAt}, ${incUnread}, 'new', ${msg.direction === "in"},
        ${msg.dumoPhoneId ?? null}, ${msg.direction}, ${msg.waChatJid ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        last_message = EXCLUDED.last_message,
        last_message_at = EXCLUDED.last_message_at,
        last_message_direction = EXCLUDED.last_message_direction,
        unread = lead_conversations.unread + ${incUnread},
        online = CASE
          WHEN ${msg.direction === "in"} THEN true
          ELSE lead_conversations.online END,
        customer_name = CASE
          WHEN lead_conversations.customer_name = '' OR lead_conversations.customer_name IS NULL
            THEN EXCLUDED.customer_name
          ELSE lead_conversations.customer_name END,
        phone = CASE
          WHEN length(regexp_replace(EXCLUDED.phone, '\\D', '', 'g')) <= 13
            AND length(regexp_replace(lead_conversations.phone, '\\D', '', 'g')) >= 14
            THEN EXCLUDED.phone
          WHEN lead_conversations.phone = '' OR lead_conversations.phone IS NULL
            THEN EXCLUDED.phone
          ELSE lead_conversations.phone END,
        wa_chat_jid = CASE
          WHEN EXCLUDED.wa_chat_jid IS NOT NULL AND EXCLUDED.wa_chat_jid LIKE '%@lid'
            THEN EXCLUDED.wa_chat_jid
          ELSE COALESCE(EXCLUDED.wa_chat_jid, lead_conversations.wa_chat_jid)
        END,
        dumo_phone_id = COALESCE(lead_conversations.dumo_phone_id, EXCLUDED.dumo_phone_id)
    `;

    await sql`
      INSERT INTO lead_messages (
        id, conversation_id, direction, body, created_at, read,
        message_type, media_asset_id, caption, company_id
      )
      VALUES (
        ${msg.waMessageId}, ${msg.conversationId}, ${msg.direction},
        ${msg.body}, ${msg.createdAt}, ${msg.direction === "out"},
        ${msg.messageType ?? "text"}, ${msg.mediaAssetId ?? null},
        ${msg.caption ?? null}, ${msg.companyId ?? null}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const convRows = (await sql`
      SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${msg.conversationId}
    `) as unknown as { assigned_advisor_id: string | null }[];
    const assignedAdvisorId = convRows[0]?.assigned_advisor_id ?? null;
    const { emitLeadsMessageNew, messageNewPayloadFromIncoming } = await import(
      "@/server/realtime/emit"
    );
    emitLeadsMessageNew(messageNewPayloadFromIncoming(msg, assignedAdvisorId));
  }

  async getAssignedAdvisorId(conversationId: string): Promise<string | null> {
    await ensureSchemaForRead();
    const sql = getSql();
    if (!sql) return null;
    const rows = (await sql`
      SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${conversationId}
    `) as unknown as { assigned_advisor_id: string | null }[];
    return rows[0]?.assigned_advisor_id ?? null;
  }

  async updateMessageBodyIfPlaceholder(waMessageId: string, body: string): Promise<boolean> {
    await ensureSchema();
    const sql = getSql()!;
    const placeholder = "📩 Mensaje recibido por WhatsApp Web";
    const rows = (await sql`
      UPDATE lead_messages
      SET body = ${body}
      WHERE id = ${waMessageId}
        AND (body = ${placeholder} OR body = '')
      RETURNING conversation_id
    `) as unknown as { conversation_id: string }[];
    if (!rows[0]?.conversation_id) return false;
    await sql`
      UPDATE lead_conversations
      SET last_message = ${body}
      WHERE id = ${rows[0].conversation_id}
        AND last_message = ${placeholder}
    `;
    const convId = rows[0].conversation_id;
    const convRows = (await sql`
      SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${convId}
    `) as unknown as { assigned_advisor_id: string | null }[];
    const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
    emitLeadsConversationUpdated({
      conversationId: convId,
      assignedAdvisorId: convRows[0]?.assigned_advisor_id ?? null,
      reason: "message",
    });
    return true;
  }

  async markRead(conversationId: string): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    await sql`UPDATE lead_conversations SET unread = 0 WHERE id = ${conversationId}`;
    const convRows = (await sql`
      SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${conversationId}
    `) as unknown as { assigned_advisor_id: string | null }[];
    const { emitLeadsConversationUpdated } = await import("@/server/realtime/emit");
    emitLeadsConversationUpdated({
      conversationId,
      unread: 0,
      assignedAdvisorId: convRows[0]?.assigned_advisor_id ?? null,
      reason: "read",
    });
  }

  async getSendFromPhoneId(conversationId: string): Promise<string | null> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = (await sql`
      SELECT dumo_phone_id FROM lead_conversations WHERE id = ${conversationId}
    `) as unknown as { dumo_phone_id: string | null }[];
    return rows[0]?.dumo_phone_id ?? null;
  }

  async getWaChatJid(conversationId: string): Promise<string | null> {
    await ensureSchema();
    const sql = getSql()!;
    try {
      const rows = (await sql`
        SELECT wa_chat_jid FROM lead_conversations WHERE id = ${conversationId}
      `) as unknown as { wa_chat_jid: string | null }[];
      return rows[0]?.wa_chat_jid?.trim() || null;
    } catch {
      return null;
    }
  }

  async findConversationIdByWaChatJid(waChatJid: string): Promise<string | null> {
    await ensureSchema();
    const sql = getSql()!;
    try {
      const rows = (await sql`
        SELECT id FROM lead_conversations
        WHERE wa_chat_jid = ${waChatJid}
        LIMIT 1
      `) as unknown as { id: string }[];
      return rows[0]?.id ?? null;
    } catch {
      return null;
    }
  }

  async findWebQrConversationId(phoneDigits: string, waChatJid?: string): Promise<string | null> {
    await ensureSchema();
    const sql = getSql()!;
    const jid = waChatJid?.trim();
    const digits = normalizeWhatsAppPhoneDigits(phoneDigits);

    if (jid) {
      const byJid = await this.findConversationIdByWaChatJid(jid);
      if (byJid) return byJid;

      const lidUser = jid.split("@")[0]?.replace(/\D/g, "") ?? "";
      if (lidUser && jid.endsWith("@lid")) {
        const byLidId = webQrConversationId(lidUser);
        const rows = (await sql`
          SELECT id FROM lead_conversations WHERE id = ${byLidId} LIMIT 1
        `) as unknown as { id: string }[];
        if (rows[0]?.id) return rows[0].id;
      }
    }

    if (digits && !isLikelyWhatsAppLid(digits)) {
      const canonical = webQrConversationId(digits);
      const rows = (await sql`
        SELECT id FROM lead_conversations WHERE id = ${canonical} LIMIT 1
      `) as unknown as { id: string }[];
      if (rows[0]?.id) return rows[0].id;

      const byPhone = (await sql`
        SELECT id FROM lead_conversations
        WHERE id LIKE 'webqr:%'
          AND regexp_replace(phone, '\\D', '', 'g') = ${digits}
        ORDER BY last_message_at DESC
        LIMIT 1
      `) as unknown as { id: string }[];
      if (byPhone[0]?.id) return byPhone[0].id;
    }

    if (digits && isLikelyWhatsAppLid(digits)) {
      const lidConv = webQrConversationId(digits);
      const rows = (await sql`
        SELECT id FROM lead_conversations WHERE id = ${lidConv} LIMIT 1
      `) as unknown as { id: string }[];
      if (rows[0]?.id) return rows[0].id;
    }

    return null;
  }

  async mergeWebQrConversations(targetId: string, duplicateId: string): Promise<void> {
    if (!targetId || !duplicateId || targetId === duplicateId) return;
    if (!isWebQrConversation(targetId) || !isWebQrConversation(duplicateId)) return;

    await ensureSchema();
    const sql = getSql()!;

    await sql`
      UPDATE lead_messages
      SET conversation_id = ${targetId}
      WHERE conversation_id = ${duplicateId}
    `;

    await sql`
      UPDATE lead_conversations AS target
      SET
        unread = target.unread + COALESCE((
          SELECT unread FROM lead_conversations WHERE id = ${duplicateId}
        ), 0),
        wa_chat_jid = COALESCE(target.wa_chat_jid, (
          SELECT wa_chat_jid FROM lead_conversations WHERE id = ${duplicateId}
        ))
      WHERE target.id = ${targetId}
    `;

    await sql`DELETE FROM lead_conversations WHERE id = ${duplicateId}`;
  }

  async updateDumoPhoneId(conversationId: string, dumoPhoneId: string): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    await sql`
      UPDATE lead_conversations SET dumo_phone_id = ${dumoPhoneId} WHERE id = ${conversationId}
    `;
  }

  async getAccessTokenForPhoneId(phoneNumberId: string): Promise<string | null> {
    await ensureSchema();
    const sql = getSql()!;
    const rows = (await sql`
      SELECT access_token FROM connected_numbers WHERE phone_number_id = ${phoneNumberId}
    `) as unknown as { access_token: string | null }[];
    const token = rows[0]?.access_token?.trim();
    return token || null;
  }

  async listConnectedPhoneIds(): Promise<string[]> {
    await ensureSchema();
    const sql = getSql()!;
    // Solo los números con token utilizable cuentan como activos: un número ya
    // desconectado (sin token) no debe usarse para responder.
    const rows = (await sql`
      SELECT phone_number_id FROM connected_numbers
      WHERE access_token IS NOT NULL AND btrim(access_token) <> ''
    `) as unknown as { phone_number_id: string }[];
    return rows.map((r) => r.phone_number_id);
  }

  async registerNumber(number: ConnectedNumber): Promise<void> {
    await ensureSchema();
    const sql = getSql()!;
    const token = number.accessToken?.trim() || null;
    await sql`
      INSERT INTO connected_numbers
        (phone_number_id, display_phone, waba_id, label, access_token)
      VALUES (
        ${number.phoneNumberId}, ${number.displayPhone}, ${number.wabaId},
        ${number.label}, ${token}
      )
      ON CONFLICT (phone_number_id) DO UPDATE SET
        display_phone = EXCLUDED.display_phone,
        waba_id = EXCLUDED.waba_id,
        label = EXCLUDED.label,
        access_token = COALESCE(EXCLUDED.access_token, connected_numbers.access_token)
    `;
  }
}

export function getConversationRepository(): ConversationRepository {
  return hasDatabase()
    ? new PostgresConversationRepository()
    : new MockConversationRepository();
}
