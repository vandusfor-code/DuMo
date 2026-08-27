import "server-only";
import type { BridgeInboundPayload } from "@/server/web-qr/types";
import type { WhatsAppInboundMessage } from "@/server/whatsapp/inbound-persist";

export type WebQrInboundJob = {
  kind: "web-qr";
  payload: BridgeInboundPayload;
};

export type WhatsAppInboundJob = {
  kind: "whatsapp";
  msg: WhatsAppInboundMessage;
  phoneId?: string;
  customerName: string;
};

export type InboundJobData = WebQrInboundJob | WhatsAppInboundJob;

export const INBOUND_QUEUE_NAME = "inbound-messages";
