"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import { fetchAdvisorConversations, leadKeys } from "@/hooks/use-leads";
import { REALTIME_FALLBACK_POLL_MS } from "@/providers/realtime-provider";
import type { AdminConversation } from "@/types/admin-lead";

export const MESSAGE_POLL_MS = REALTIME_FALLBACK_POLL_MS;

export function useAdvisorConversationsPoll(enabled = true) {
  return useQuery({
    queryKey: leadKeys.conversations,
    queryFn: fetchAdvisorConversations,
    refetchInterval: MESSAGE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 1500,
    retry: 2,
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useAdminConversationsPoll(enabled = true) {
  return useQuery({
    queryKey: ["admin", "leads", "conversations"],
    queryFn: () => apiGet<AdminConversation[]>("/api/admin/leads"),
    refetchInterval: MESSAGE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 1500,
    retry: 2,
    enabled,
    placeholderData: (prev) => prev,
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
