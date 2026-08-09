export type {
  WhatsAppChannel,
  WhatsAppChannelStatus,
  WhatsAppChannelType,
} from "@/types/web-qr";

export type WebQrSession = {
  id: string;
  channelId: string;
  sessionData: Record<string, unknown>;
  browserUserAgent: string;
  bridgeSessionId: string | null;
  lastReconnectAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BridgeSessionStatus = {
  sessionId: string;
  status: "INITIALIZING" | "QR_PENDING" | "CONNECTED" | "DISCONNECTED";
  qrDataUrl?: string;
  phoneNumber?: string;
};

export type BridgeInboundPayload = {
  channelId: string;
  /** Teléfono real (solo dígitos) cuando Meta/Baileys lo expone. */
  from: string;
  /** JID completo para responder (p. ej. 57300@s.whatsapp.net o xxx@lid). */
  senderJid?: string;
  messageId: string;
  timestamp: number;
  type: "text" | "image" | "audio" | "document" | "video" | "unknown";
  text?: string;
  mediaUrl?: string;
  mimeType?: string;
  audioPtt?: boolean;
  caption?: string;
  customerName?: string;
};
