import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { isLikelyWhatsAppLid, normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { leadsService } from "@/services/leads.service";
import type { BridgeInboundPayload } from "@/server/web-qr/types";

async function resolveWebQrConversationId(
  phone: string,
  senderJid?: string,
): Promise<{ conversationId: string; phone: string }> {
  const repo = getConversationRepository();
  const digits = normalizeWhatsAppPhoneDigits(phone);
  const realPhone = digits && !isLikelyWhatsAppLid(digits) ? digits : null;
  const canonicalId = realPhone ? webQrConversationId(realPhone) : null;

  const existing = await repo.findWebQrConversationId(digits, senderJid);

  if (existing && canonicalId && existing !== canonicalId) {
    const existingSuffix = existing.replace(/^webqr:/, "");
    if (isLikelyWhatsAppLid(existingSuffix)) {
      await repo.mergeWebQrConversations(canonicalId, existing);
      return { conversationId: canonicalId, phone: realPhone! };
    }
  }

  if (existing) {
    return {
      conversationId: existing,
      phone: realPhone ?? digits,
    };
  }

  if (canonicalId && realPhone) {
    return { conversationId: canonicalId, phone: realPhone };
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

  if (payload.type === "audio" && payload.mediaUrl) {
    await leadsService.receiveInboundAudioFromUrl({
      ...baseMessage,
      mediaUrl: payload.mediaUrl,
      mimeType: payload.mimeType,
      preview: payload.text?.trim(),
      audioPtt: payload.audioPtt,
    });
    return;
  }

  if (payload.type === "image" && payload.mediaUrl) {
    await leadsService.receiveInboundImageFromUrl({
      ...baseMessage,
      mediaUrl: payload.mediaUrl,
      mimeType: payload.mimeType,
      caption: payload.caption ?? payload.text?.trim(),
    });
    return;
  }

  let body = payload.text?.trim() ?? "";

  if (!body && payload.type !== "text") {
    body = `⚠️ DuMo recibió ${payload.type} por WhatsApp Web. Pide al cliente que envíe texto o imagen.`;
  }
  if (!body) return;

  const repo = getConversationRepository();
  const patched = await repo.updateMessageBodyIfPlaceholder(payload.messageId, body);
  if (patched) return;

  await leadsService.receiveMessage({
    ...baseMessage,
    body,
    messageType: "text",
  });
}
