import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { bridgeSendText } from "@/server/web-qr/bridge-client";
import { getConversationRepository } from "@/repositories/conversation.repository";

export async function sendWebQrText(input: {
  channelId: string;
  conversationId: string;
  to: string;
  text: string;
  companyId?: string;
}): Promise<{ id: string }> {
  const phone =
    webQrConversationId(input.to).replace(/^webqr:/, "") ||
    input.to.replace(/\D/g, "");

  const sent = await bridgeSendText({
    channelId: input.channelId,
    to: phone,
    text: input.text,
  });

  const repo = getConversationRepository();
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
  });

  return sent;
}

/** Resuelve el channel_id WEB_QR para una conversación webqr:* */
export async function resolveWebQrChannelId(conversationId: string): Promise<string | null> {
  const repo = getConversationRepository();
  const phoneId = await repo.getSendFromPhoneId(conversationId);
  return phoneId;
}
