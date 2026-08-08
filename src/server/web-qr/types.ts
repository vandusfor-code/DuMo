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
  from: string;
  messageId: string;
  timestamp: number;
  type: "text" | "image" | "audio" | "document" | "video" | "unknown";
  text?: string;
  mediaUrl?: string;
  caption?: string;
  customerName?: string;
};
