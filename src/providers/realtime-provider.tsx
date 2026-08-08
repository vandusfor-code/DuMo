"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { leadKeys } from "@/hooks/use-leads";
import type { ChatMessage } from "@/types/conversation";

/** Polling de respaldo cuando WebSocket no está conectado o como red de seguridad. */
export const REALTIME_FALLBACK_POLL_MS = 45_000;

type MessageNewEvent = {
  conversationId: string;
  messageId?: string;
  direction?: "in" | "out";
  assignedAdvisorId?: string | null;
  text?: string;
  time?: string;
  messageType?: "text" | "image";
};

type ConversationUpdatedEvent = {
  conversationId: string;
  assignedAdvisorId?: string | null;
  unread?: number;
  reason?: string;
};

function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: MessageNewEvent,
) {
  if (!payload.messageId || !payload.text || !payload.conversationId) return;

  const patch = (prev: ChatMessage[] | undefined) => {
    if (!prev) return prev;
    if (prev.some((m) => m.id === payload.messageId)) return prev;
    const row: ChatMessage = {
      id: payload.messageId!,
      conversationId: payload.conversationId,
      text: payload.text!,
      time: payload.time ?? "",
      direction: payload.direction ?? "in",
      read: false,
      messageType: payload.messageType ?? "text",
    };
    return [...prev, row];
  };

  queryClient.setQueryData(leadKeys.messages(payload.conversationId), patch);
  queryClient.setQueryData(["admin", "leads", "messages", payload.conversationId], patch);
}

function invalidateBandeja(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
  queryClient.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
}

function invalidateForConversation(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  invalidateBandeja(queryClient);
  queryClient.invalidateQueries({ queryKey: leadKeys.messages(conversationId) });
  queryClient.invalidateQueries({ queryKey: ["admin", "leads", "messages", conversationId] });
  queryClient.invalidateQueries({ queryKey: ["admin", "leads", "detail", conversationId] });
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = socket;

    socket.on("leads:message:new", (payload: MessageNewEvent) => {
      if (!payload?.conversationId) return;
      appendMessageToCache(queryClient, payload);
      invalidateBandeja(queryClient);
    });

    socket.on("leads:conversation:updated", (payload: ConversationUpdatedEvent) => {
      if (!payload?.conversationId) return;
      invalidateForConversation(queryClient, payload.conversationId);
    });

    socket.on("connect", () => {
      invalidateBandeja(queryClient);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return <>{children}</>;
}
