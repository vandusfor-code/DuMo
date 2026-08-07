"use client";

import { useQuery } from "@tanstack/react-query";
import { advisorApiGet } from "@/lib/advisor-query";
import type { LatestGestionDraft } from "@/types/lead";

export const latestGestionKeys = {
  byConversation: (id: string) => ["leads", "gestion", "latest", id] as const,
};

export function useLatestGestionDraft(conversationId: string, enabled = true) {
  return useQuery({
    queryKey: latestGestionKeys.byConversation(conversationId),
    queryFn: () =>
      advisorApiGet<LatestGestionDraft | null>(
        `/api/leads/gestion/latest?conversationId=${encodeURIComponent(conversationId)}`,
      ),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 15_000,
    retry: 2,
  });
}
