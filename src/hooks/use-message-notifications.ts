"use client";

import { useEffect, useRef } from "react";
import {
  playMessageSound,
  setupMessageNotificationUnlock,
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

function notifyInbound(c: ConvLike, times: number) {
  const count = Math.max(1, times);
  playMessageSound();
  showMessageNotification(c.customerName, c.lastMessage, c.id);
  if (count > 1) {
    for (let i = 1; i < count; i++) {
      window.setTimeout(() => playMessageSound(), i * 350);
    }
  }
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
        notifyInbound(c, next.unread || 1);
      }
      store.set(c.id, next);
      continue;
    }

    if (isInbound(prev, next)) {
      const delta = Math.max(1, next.unread - prev.unread);
      notifyInbound(c, delta);
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
