"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { leadKeys } from "@/hooks/use-leads";

/** Polling de respaldo cuando WebSocket no está conectado o como red de seguridad. */
export const REALTIME_FALLBACK_POLL_MS = 45_000;

type MessageNewEvent = {
  conversationId: string;
  messageId?: string;
  direction?: "in" | "out";
  assignedAdvisorId?: string | null;
};

type ConversationUpdatedEvent = {
  conversationId: string;
  assignedAdvisorId?: string | null;
  unread?: number;
  reason?: string;
};

function invalidateForConversation(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
  queryClient.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
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
      invalidateForConversation(queryClient, payload.conversationId);
    });

    socket.on("leads:conversation:updated", (payload: ConversationUpdatedEvent) => {
      if (!payload?.conversationId) return;
      invalidateForConversation(queryClient, payload.conversationId);
    });

    socket.on("connect", () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
      queryClient.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return <>{children}</>;
}
