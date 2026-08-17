export type WhatsAppChannelType = "WABA" | "WEB_QR";

export type WhatsAppChannelStatus = "CONNECTED" | "DISCONNECTED" | "INITIALIZING";

export type WhatsAppChannel = {
  id: string;
  companyId: string;
  phoneNumber: string;
  label: string;
  channelType: WhatsAppChannelType;
  status: WhatsAppChannelStatus;
  /** Operador (WOM/Claro) al que pertenece este número. */
  carrier: string;
  createdAt: string;
  updatedAt: string;
};
