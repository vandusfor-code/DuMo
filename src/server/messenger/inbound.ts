import "server-only";
import { messengerConversationId } from "@/lib/messenger/conversation-id";
import { leadsService } from "@/services/leads.service";
import { fetchMessengerProfile } from "@/server/messenger/send";

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type?: string }>;
    sticker_id?: number;
  };
};

function inboundBody(event: MessengerEvent): string | null {
  const text = event.message?.text?.trim();
  if (text) return text;

  const attachments = event.message?.attachments ?? [];
  if (attachments.some((item) => item.type === "image")) {
    return "⚠️ DuMo no admite imágenes por Messenger aún. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "video")) {
    return "⚠️ DuMo no admite videos por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "audio")) {
    return "⚠️ DuMo no admite audios por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.some((item) => item.type === "file")) {
    return "⚠️ DuMo no admite archivos por Messenger. Pide al cliente que envíe texto.";
  }
  if (attachments.length > 0) {
    return "⚠️ DuMo no admite este tipo de contenido por Messenger. Pide al cliente que envíe texto.";
  }
  if (event.message?.sticker_id) {
    return "⚠️ DuMo no admite stickers por Messenger. Pide al cliente que envíe texto.";
  }
  return null;
}

export async function persistMessengerInbound(event: MessengerEvent, pageId: string): Promise<void> {
  const psid = event.sender?.id;
  const mid = event.message?.mid;

  if (!psid || !mid) return;
  if (event.message?.is_echo) return;

  const body = inboundBody(event);
  if (!body) return;

  const conversationId = messengerConversationId(psid);
  const customerName = (await fetchMessengerProfile(psid)) || `Messenger ${psid.slice(-6)}`;

  await leadsService.receiveMessage({
    waMessageId: `messenger-${mid}`,
    conversationId,
    phone: psid,
    customerName,
    body: body,
    direction: "in",
    createdAt: event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    dumoPhoneId: pageId,
    messageType: "text",
  });
}
