import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { isLikelyWhatsAppLid } from "@/lib/whatsapp/phone";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { leadsService } from "@/services/leads.service";
import type { BridgeInboundPayload } from "@/server/web-qr/types";

async function resolveWebQrConversationId(
  phone: string,
  senderJid?: string,
): Promise<{ conversationId: string; phone: string }> {
  const repo = getConversationRepository();
  const digits = phone.replace(/\D/g, "");

  if (senderJid?.trim()) {
    const existing = await repo.findConversationIdByWaChatJid(senderJid.trim());
    if (existing) {
      return {
        conversationId: existing,
        phone: digits && !isLikelyWhatsAppLid(digits) ? digits : phone,
      };
    }
  }

  if (digits && !isLikelyWhatsAppLid(digits)) {
    return { conversationId: webQrConversationId(digits), phone: digits };
  }

  const fallback = digits || senderJid?.split("@")[0]?.replace(/\D/g, "") || "";
  return { conversationId: webQrConversationId(fallback), phone: fallback };
}

export async function persistWebQrInbound(payload: BridgeInboundPayload): Promise<void> {
  let channelId = payload.channelId;
  const known = await webQrRepository.getChannel(channelId);
  if (!known) {
    const fallback = await webQrRepository.findWebQrChannelForRouting(null);
    if (fallback) channelId = fallback.id;
  }

  const { conversationId, phone } = await resolveWebQrConversationId(
    payload.from,
    payload.senderJid,
  );
  if (!conversationId.replace(/^webqr:/, "")) return;

  const createdAt = new Date(payload.timestamp * 1000).toISOString();

  let body = payload.text?.trim() ?? "";
  let messageType: "text" | "image" = "text";

  const baseMessage = {
    waMessageId: payload.messageId,
    conversationId,
    phone,
    customerName: payload.customerName ?? "",
    direction: "in" as const,
    createdAt,
    dumoPhoneId: channelId,
    waChatJid: payload.senderJid?.trim() || undefined,
  };

  if (payload.type === "image" && payload.mediaUrl) {
    messageType = "image";
    body = payload.caption?.trim() || "📷 Imagen";
    await leadsService.receiveMessage({
      ...baseMessage,
      body,
      messageType,
    });
    return;
  }

  if (!body && payload.type !== "text") {
    body = `⚠️ DuMo recibió ${payload.type} por WhatsApp Web. Pide al cliente que envíe texto o imagen.`;
  }
  if (!body) return;

  await leadsService.receiveMessage({
    ...baseMessage,
    body,
    messageType: "text",
  });
}
