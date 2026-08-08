import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { resolveWhatsAppWebSendJid } from "@/lib/whatsapp/phone";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeSendText } from "@/server/web-qr/bridge-client";
import { ensureWebQrBridgeReady } from "@/server/web-qr/ensure-session";

export async function sendWebQrText(input: {
  channelId: string;
  conversationId: string;
  to: string;
  text: string;
  companyId?: string;
}): Promise<{ id: string }> {
  const repo = getConversationRepository();
  const storedJid = await repo.getWaChatJid(input.conversationId);
  const phone =
    webQrConversationId(input.to).replace(/^webqr:/, "") ||
    input.to.replace(/\D/g, "");
  const jid = resolveWhatsAppWebSendJid(phone, storedJid);

  await ensureWebQrBridgeReady(input.channelId);

  const sent = await bridgeSendText({
    channelId: input.channelId,
    jid,
    text: input.text,
  });

  await repo.saveMessage({
    waMessageId: sent.id,
    conversationId: input.conversationId,
    phone,
    customerName: "",
    body: input.text,
    direction: "out",
    createdAt: new Date().toISOString(),
    dumoPhoneId: input.channelId,
    messageType: "text",
    companyId: input.companyId,
    waChatJid: jid,
  });

  return sent;
}

/**
 * Resuelve qué línea WEB_QR debe usarse para responder.
 * Si la conversación apunta a un canal eliminado, reasigna a la línea activa.
 */
export async function resolveWebQrChannelId(conversationId: string): Promise<string> {
  const repo = getConversationRepository();
  const stored = await repo.getSendFromPhoneId(conversationId);
  const channel = await webQrRepository.findWebQrChannelForRouting(stored);

  if (!channel) {
    throw new Error(
      "No hay línea WhatsApp Web configurada. Ve a Admin → WhatsApp Web (QR), agrega una línea y escanea el QR.",
    );
  }

  if (stored !== channel.id) {
    await repo.updateDumoPhoneId(conversationId, channel.id);
  }

  return channel.id;
}

/** Resuelve el channel_id WEB_QR para una conversación webqr:* */
export async function resolveWebQrChannelIdOrNull(conversationId: string): Promise<string | null> {
  try {
    return await resolveWebQrChannelId(conversationId);
  } catch {
    return null;
  }
}
