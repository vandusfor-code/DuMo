import "server-only";
import { leadsService } from "@/services/leads.service";

const UNSUPPORTED_TYPE_LABELS: Record<string, string> = {
  document: "documentos",
  video: "videos",
  audio: "audios",
  sticker: "stickers",
  location: "ubicaciones",
  contacts: "contactos",
  interactive: "mensajes interactivos",
  button: "botones",
  reaction: "reacciones",
  order: "pedidos",
  system: "mensajes del sistema",
  unknown: "este tipo de contenido",
};

function unsupportedBody(type: string): string {
  const label = UNSUPPORTED_TYPE_LABELS[type] ?? UNSUPPORTED_TYPE_LABELS.unknown;
  return `⚠️ DuMo no admite ${label}. Pide al cliente que envíe texto o una imagen.`;
}

function imageDownloadFailedBody(): string {
  return "⚠️ No se pudo recibir la imagen. Pide al cliente que la reenvíe.";
}

export type WhatsAppInboundMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: {
    id?: string;
    mime_type?: string;
    caption?: string;
  };
  audio?: {
    id?: string;
    mime_type?: string;
    voice?: boolean;
  };
};

export async function persistWhatsAppInboundMessage(input: {
  msg: WhatsAppInboundMessage;
  phoneId?: string;
  customerName: string;
}): Promise<void> {
  const { msg, phoneId, customerName } = input;
  if (!msg.from || !msg.id) return;

  const createdAt = msg.timestamp
    ? new Date(Number(msg.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const base = {
    waMessageId: msg.id,
    conversationId: msg.from,
    phone: msg.from,
    customerName,
    direction: "in" as const,
    createdAt,
    dumoPhoneId: phoneId,
  };

  const type = msg.type ?? "text";

  if (type === "text" && msg.text?.body) {
    await leadsService.receiveMessage({
      ...base,
      body: msg.text.body,
      messageType: "text",
    });
    return;
  }

  if (type === "image" && msg.image?.id) {
    try {
      await leadsService.receiveInboundImage({
        ...base,
        waMediaId: msg.image.id,
        caption: msg.image.caption,
        mimeType: msg.image.mime_type,
      });
      return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[whatsapp-inbound] image failed", { messageId: msg.id, detail, error });
      await leadsService.receiveMessage({
        ...base,
        body: imageDownloadFailedBody(),
        messageType: "text",
      });
      return;
    }
  }

  if (type === "audio" && msg.audio?.id) {
    try {
      await leadsService.receiveInboundAudio({
        ...base,
        waMediaId: msg.audio.id,
        mimeType: msg.audio.mime_type,
        voice: msg.audio.voice,
      });
      return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[whatsapp-inbound] audio failed", { messageId: msg.id, detail, error });
      await leadsService.receiveMessage({
        ...base,
        body: "⚠️ No se pudo recibir el audio. Pide al cliente que lo reenvíe.",
        messageType: "text",
      });
      return;
    }
  }

  if (type !== "text") {
    console.warn("[whatsapp-inbound] unsupported type", { type, messageId: msg.id, from: msg.from });
    await leadsService.receiveMessage({
      ...base,
      body: unsupportedBody(type),
      messageType: "text",
    });
    return;
  }

  if (msg.text?.body) {
    await leadsService.receiveMessage({ ...base, body: msg.text.body, messageType: "text" });
  }
}
