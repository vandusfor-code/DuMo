"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { leadKeys } from "@/hooks/use-leads";
import type { AdminConversation } from "@/types/admin-lead";
import type { Conversation } from "@/types/conversation";

export const MESSAGE_POLL_MS = 4000;

export function useAdvisorConversationsPoll(enabled = true) {
  return useQuery({
    queryKey: leadKeys.conversations,
    queryFn: () => apiGet<Conversation[]>("/api/leads/conversations"),
    refetchInterval: MESSAGE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 1500,
    retry: 1,
    enabled,
  });
}

export function useAdminConversationsPoll(enabled = true) {
  return useQuery({
    queryKey: ["admin", "leads", "conversations"],
    queryFn: () => apiGet<AdminConversation[]>("/api/admin/leads"),
    refetchInterval: MESSAGE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 1500,
    retry: 1,
    enabled,
  });
}

export function useUnreadMessageCount(role: "advisor" | "admin") {
  const advisor = useAdvisorConversationsPoll(role === "advisor");
  const admin = useAdminConversationsPoll(role === "admin");
  const data = role === "advisor" ? advisor.data : admin.data;

  return useMemo(
    () => (data ?? []).reduce((sum, c) => sum + (c.unread || 0), 0),
    [data],
  );
}
