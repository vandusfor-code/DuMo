"use client";

import { useEffect, useRef } from "react";
import {
  playInboundClientMessageSound,
  setupMessageNotificationUnlock,
  shouldPlayPollInboundSound,
  showMessageNotification,
} from "@/lib/message-notifications";
import {
  useAdminConversationsPoll,
  useAdvisorConversationsPoll,
} from "@/hooks/use-unread-messages";

type ConvLike = {
  id: string;
  customerName: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  lastMessageDirection?: "in" | "out";
};

type Snap = {
  unread: number;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageDirection: "in" | "out";
};

function isInbound(prev: Snap | undefined, next: Snap): boolean {
  if (!prev) return false;
  if (next.unread > prev.unread) return true;
  if (next.lastMessageDirection !== "in") return false;
  return (
    next.lastMessage !== prev.lastMessage || next.lastMessageTime !== prev.lastMessageTime
  );
}

function snap(c: ConvLike): Snap {
  return {
    unread: c.unread || 0,
    lastMessage: c.lastMessage,
    lastMessageTime: c.lastMessageTime,
    lastMessageDirection: c.lastMessageDirection ?? "in",
  };
}

function notifyInbound(c: ConvLike) {
  if (!shouldPlayPollInboundSound(c.id)) return;
  playInboundClientMessageSound({ conversationId: c.id });
  showMessageNotification(c.customerName, c.lastMessage, c.id);
}

function processConversations(
  list: ConvLike[],
  store: Map<string, Snap>,
  ready: boolean,
) {
  if (!ready) {
    for (const c of list) store.set(c.id, snap(c));
    return;
  }

  for (const c of list) {
    const prev = store.get(c.id);
    const next = snap(c);

    if (!prev) {
      if (next.unread > 0 || next.lastMessageDirection === "in") {
        notifyInbound(c);
      }
      store.set(c.id, next);
      continue;
    }

    if (isInbound(prev, next)) {
      notifyInbound(c);
    }

    store.set(c.id, next);
  }
}

export function useMessageNotifications(role: "advisor" | "admin") {
  const advisorQuery = useAdvisorConversationsPoll(role === "advisor");
  const adminQuery = useAdminConversationsPoll(role === "admin");
  const data = role === "advisor" ? advisorQuery.data : adminQuery.data;

  const storeRef = useRef(new Map<string, Snap>());
  const readyRef = useRef(false);

  useEffect(() => setupMessageNotificationUnlock(), []);

  useEffect(() => {
    if (!data) return;

    if (!readyRef.current) {
      processConversations(data, storeRef.current, false);
      readyRef.current = true;
      return;
    }

    processConversations(data, storeRef.current, true);
  }, [data]);
}
