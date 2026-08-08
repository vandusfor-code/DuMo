import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { resolveWhatsAppWebSendJid } from "@/lib/whatsapp/phone";
import { bridgeSendText } from "@/server/web-qr/bridge-client";
import { ensureWebQrBridgeReady } from "@/server/web-qr/ensure-session";
import { getConversationRepository } from "@/repositories/conversation.repository";

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

/** Resuelve el channel_id WEB_QR para una conversación webqr:* */
export async function resolveWebQrChannelId(conversationId: string): Promise<string | null> {
  const repo = getConversationRepository();
  const phoneId = await repo.getSendFromPhoneId(conversationId);
  return phoneId;
}
