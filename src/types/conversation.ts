import type { InboxState } from "@/types/inbox-state";

export type { InboxState } from "@/types/inbox-state";

/** Estado comercial de la conversación (usado por los filtros). */
export type ConversationStatus = "new" | "in_progress" | "converted" | "lost";

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  new: "Nuevo",
  in_progress: "En gestión",
  converted: "Convertido",
  lost: "Perdido",
};

/** Canal de origen de la conversación. */
export type ConversationChannel = "whatsapp" | "messenger" | "web_qr";

/** Resumen de una conversación en la bandeja. */
export interface ConversationTipification {
  slug: string;
  name: string;
  badgeBg: string;
  badgeText: string;
}

/** Resumen de una conversación en la bandeja. */
export interface Conversation {
  id: string;
  customerName: string;
  phone: string;
  rut: string;
  avatarUrl?: string;
  channel?: ConversationChannel;
  lastMessage: string;
  /** Hora legible del último mensaje, ej. "3:25 p. m.". */
  lastMessageTime: string;
  /** Dirección del último mensaje en la bandeja. */
  lastMessageDirection?: "in" | "out";
  unread: number;
  status: ConversationStatus;
  online: boolean;
  /** P1.2 — visible en bandeja activa vs cerrada (filtro en P1.5). */
  inboxState?: InboxState;
  /** Última tipificación guardada (lead_gestiones más reciente). */
  latestTipification?: ConversationTipification | null;
  /** Operador (WOM/Claro) — detectado por el número de entrada, editable en la gestión. */
  carrier?: string;
  /** RESP-2 — aviso de tiempo de respuesta activo (min 1/2 o 4 de los escenarios A/B). */
  activeSlaWarning?: {
    scenario: "first_contact" | "follow_up";
    status: "warning_sent" | "final_warning_sent" | "escalated_no_advisor";
    minutesUnanswered: number;
  } | null;
}

/** Un mensaje dentro del chat — texto, imágenes y audios. */
export type ChatMessageType = "text" | "image" | "audio";

export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  time: string;
  /** "in" = recibido del cliente, "out" = enviado por la asesora. */
  direction: "in" | "out";
  read?: boolean;
  messageType?: ChatMessageType;
  mediaUrl?: string;
  caption?: string;
  mediaAssetId?: string;
  /** Tarjeta de enlace opcional (preview). */
  link?: {
    title: string;
    description: string;
    url: string;
  };
}
