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
  messageType?: "text" | "image" | "audio";
  mediaUrl?: string;
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
    mediaUrl: msg.mediaUrl,
  };
}

export type LeadsConversationUpdatedPayload = {
  conversationId: string;
  assignedAdvisorId?: string | null;
  unread?: number;
  reason?: "message" | "read" | "assign" | "auto-assign" | "reopen" | "sla-resolved";
};

type IoLike = {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
  in: (room: string) => { disconnectSockets: (close?: boolean) => void };
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

export type LeadsSlaWarningPayload = {
  conversationId: string;
  advisorId: string;
  customerName: string;
  scenario: "first_contact" | "follow_up";
  status: "warning_sent" | "final_warning_sent";
  minutesUnanswered: number;
};

/** RESP-2 — aviso de tiempo de respuesta, a nivel de sesión (no solo el chat abierto). */
export function emitLeadsSlaWarning(payload: LeadsSlaWarningPayload) {
  const io = getIo();
  if (!io) return;
  io.to(`advisor:${payload.advisorId}`).emit("leads:sla-warning", payload);
}

export type SessionRevokedPayload = {
  userId: string;
  reason: "presence:desconectado" | "admin:forced";
};

/** Invalida sesión activa en el cliente y cierra sockets del asesor. */
export function emitSessionRevoked(userId: string, reason: SessionRevokedPayload["reason"]) {
  const io = getIo();
  if (!io) return;
  const payload: SessionRevokedPayload = { userId, reason };
  io.to(`advisor:${userId}`).emit("session:revoked", payload);
  io.in(`advisor:${userId}`).disconnectSockets(true);
}
