"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { getClientToken } from "@/lib/auth/client-token";
import { forceSessionLogout } from "@/lib/auth/force-logout";
import { leadKeys } from "@/hooks/use-leads";
import { playInboundClientMessageSound } from "@/lib/message-notifications";
import type { ChatMessage, Conversation } from "@/types/conversation";
import { SlaWarningBanners, type SlaWarningEvent } from "@/components/leads/sla-warning-banner";

/** Polling de respaldo cuando WebSocket no está conectado o como red de seguridad. */
export const REALTIME_FALLBACK_POLL_MS = 45_000;

type MessageNewEvent = {
  conversationId: string;
  messageId?: string;
  direction?: "in" | "out";
  assignedAdvisorId?: string | null;
  text?: string;
  time?: string;
  messageType?: "text" | "image" | "audio";
  mediaUrl?: string;
};

type ConversationUpdatedEvent = {
  conversationId: string;
  assignedAdvisorId?: string | null;
  unread?: number;
  reason?: string;
};

function patchSlaWarningInList(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  warning: Conversation["activeSlaWarning"],
) {
  const patch = (prev: Conversation[] | undefined) =>
    prev?.map((c) => (c.id === conversationId ? { ...c, activeSlaWarning: warning } : c));
  queryClient.setQueryData<Conversation[]>(leadKeys.conversations, patch);
}

function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  payload: MessageNewEvent,
) {
  if (!payload.messageId || !payload.conversationId) return;
  const isMedia = payload.messageType === "image" || payload.messageType === "audio";
  if (!payload.text && !isMedia) return;

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
      mediaUrl: payload.mediaUrl,
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

/** RESP-2 — banners visibles ~12s antes de desaparecer solos si no se cierran a mano. */
const SLA_BANNER_AUTO_DISMISS_MS = 12_000;

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [slaBanners, setSlaBanners] = useState<SlaWarningEvent[]>([]);

  const dismissSlaBanner = (id: string) => {
    setSlaBanners((prev) => prev.filter((e) => e.id !== id));
  };

  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/\/$/, "") || undefined;
    const token = getClientToken();
    const socket = io(realtimeUrl, {
      path: "/socket.io",
      withCredentials: !realtimeUrl,
      auth: token ? { token } : undefined,
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
      if (payload.direction === "in") {
        playInboundClientMessageSound({
          conversationId: payload.conversationId,
          messageId: payload.messageId,
        });
      }
    });

    socket.on("leads:conversation:updated", (payload: ConversationUpdatedEvent) => {
      if (!payload?.conversationId) return;
      if (payload.reason === "read" || payload.unread === 0) {
        queryClient.setQueryData<Conversation[]>(leadKeys.conversations, (prev) =>
          prev?.map((c) =>
            c.id === payload.conversationId ? { ...c, unread: 0 } : c,
          ),
        );
      }
      if (payload.reason === "sla-resolved") {
        patchSlaWarningInList(queryClient, payload.conversationId, null);
        setSlaBanners((prev) => prev.filter((e) => e.conversationId !== payload.conversationId));
      }
      invalidateForConversation(queryClient, payload.conversationId);
    });

    socket.on("leads:sla-warning", (payload: Omit<SlaWarningEvent, "id"> & { conversationId?: string }) => {
      if (!payload?.conversationId) return;
      patchSlaWarningInList(queryClient, payload.conversationId, {
        scenario: payload.scenario,
        status: payload.status,
        minutesUnanswered: payload.minutesUnanswered,
      });
      const id = `${payload.conversationId}-${payload.status}-${Date.now()}`;
      setSlaBanners((prev) => [...prev.filter((e) => e.conversationId !== payload.conversationId), { ...payload, id }]);
      setTimeout(() => dismissSlaBanner(id), SLA_BANNER_AUTO_DISMISS_MS);
    });

    socket.on("session:revoked", () => {
      forceSessionLogout("revoked");
    });

    socket.on(
      "pcs:validation:progress",
      (payload: { jobId: string; procesados: number; total: number }) => {
        if (!payload?.jobId) return;
        queryClient.setQueryData(
          ["pcs", "validate", payload.jobId],
          (prev: { progreso?: { total: number; procesados: number } } | undefined) =>
            prev ? { ...prev, progreso: { total: payload.total, procesados: payload.procesados } } : prev,
        );
      },
    );

    socket.on("pcs:validation:done", (payload: { jobId: string }) => {
      if (!payload?.jobId) return;
      queryClient.invalidateQueries({ queryKey: ["pcs", "validate", payload.jobId] });
    });

    socket.on("campaign:progress", (payload: { campaignId: string }) => {
      if (!payload?.campaignId) return;
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns", payload.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns", "list"] });
    });

    socket.on("campaign:event", (payload: { campaignId: string }) => {
      if (!payload?.campaignId) return;
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns", payload.campaignId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "campaigns", "list"] });
    });

    socket.on("connect", () => {
      invalidateBandeja(queryClient);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [queryClient]);

  return (
    <>
      {children}
      <SlaWarningBanners events={slaBanners} onDismiss={dismissSlaBanner} />
    </>
  );
}
