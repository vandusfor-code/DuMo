/** Estado comercial de la conversación (usado por los filtros). */
export type ConversationStatus = "new" | "in_progress" | "converted" | "lost";

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  new: "Nuevo",
  in_progress: "En gestión",
  converted: "Convertido",
  lost: "Perdido",
};

/** Resumen de una conversación en la bandeja. */
export interface Conversation {
  id: string;
  customerName: string;
  phone: string;
  rut: string;
  avatarUrl?: string;
  lastMessage: string;
  /** Hora legible del último mensaje, ej. "3:25 p. m.". */
  lastMessageTime: string;
  /** Dirección del último mensaje en la bandeja. */
  lastMessageDirection?: "in" | "out";
  unread: number;
  status: ConversationStatus;
  online: boolean;
}

/** Un mensaje dentro del chat. */
export interface ChatMessage {
  id: string;
  conversationId: string;
  text: string;
  time: string;
  /** "in" = recibido del cliente, "out" = enviado por la asesora. */
  direction: "in" | "out";
  read?: boolean;
  /** Tarjeta de enlace opcional (preview). */
  link?: {
    title: string;
    description: string;
    url: string;
  };
}
