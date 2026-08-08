import "server-only";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { leadsService } from "@/services/leads.service";
import type { BridgeInboundPayload } from "@/server/web-qr/types";

export async function persistWebQrInbound(payload: BridgeInboundPayload): Promise<void> {
  const phone = payload.from.replace(/\D/g, "");
  if (!phone) return;

  const conversationId = webQrConversationId(phone);
  const createdAt = new Date(payload.timestamp * 1000).toISOString();

  let body = payload.text?.trim() ?? "";
  let messageType: "text" | "image" = "text";

  if (payload.type === "image" && payload.mediaUrl) {
    messageType = "image";
    body = payload.caption?.trim() || "📷 Imagen";
    // Imagen vía URL del bridge — persistimos preview; media completa en fase 2
    await leadsService.receiveMessage({
      waMessageId: payload.messageId,
      conversationId,
      phone,
      customerName: payload.customerName ?? "",
      body,
      direction: "in",
      createdAt,
      dumoPhoneId: payload.channelId,
      messageType,
    });
    return;
  }

  if (!body && payload.type !== "text") {
    body = `⚠️ DuMo recibió ${payload.type} por WhatsApp Web. Pide al cliente que envíe texto o imagen.`;
  }
  if (!body) return;

  await leadsService.receiveMessage({
    waMessageId: payload.messageId,
    conversationId,
    phone,
    customerName: payload.customerName ?? "",
    body,
    direction: "in",
    createdAt,
    dumoPhoneId: payload.channelId,
    messageType: "text",
  });
}
