import "server-only";
import { formatChatTime } from "@/lib/format";
import type { IncomingMessage } from "@/repositories/conversation.repository";

export type LeadsMessageNewPayload = {
  conversationId: string;
  messageId?: string;
  direction?: "in" | "out";
  assignedAdvisorId?: string | null;
  /** Contenido del mensaje — permite pintar el chat al instante en el cliente. */
  text?: string;
  time?: string;
  createdAt?: string;
  messageType?: "text" | "image";
};

export function messageNewPayloadFromIncoming(
  msg: IncomingMessage,
  assignedAdvisorId: string | null,
): LeadsMessageNewPayload {
  return {
    conversationId: msg.conversationId,
    messageId: msg.waMessageId,
    direction: msg.direction,
    assignedAdvisorId,
    text: msg.body,
    time: formatChatTime(msg.createdAt),
    createdAt: msg.createdAt,
    messageType: msg.messageType ?? "text",
  };
}

export type LeadsConversationUpdatedPayload = {
  conversationId: string;
  assignedAdvisorId?: string | null;
  unread?: number;
  reason?: "message" | "read" | "assign" | "auto-assign";
};

type IoLike = {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
};

function getIo(): IoLike | null {
  const io = (globalThis as { __dumoIo?: unknown }).__dumoIo;
  if (!io || typeof io !== "object" || !("to" in io)) return null;
  return io as IoLike;
}

function emitToLeadsRooms(
  payload: { assignedAdvisorId?: string | null },
  event: string,
  data: unknown,
) {
  const io = getIo();
  if (!io) return;
  io.to("admin:leads").emit(event, data);
  const advisorId = payload.assignedAdvisorId;
  if (advisorId) {
    io.to(`advisor:${advisorId}`).emit(event, data);
  }
}

export function emitLeadsMessageNew(payload: LeadsMessageNewPayload) {
  emitToLeadsRooms(payload, "leads:message:new", payload);
}

export function emitLeadsConversationUpdated(payload: LeadsConversationUpdatedPayload) {
  emitToLeadsRooms(payload, "leads:conversation:updated", payload);
}
