"use client";

import { useQuery } from "@tanstack/react-query";
import { advisorApiGet } from "@/lib/advisor-query";
import type { GeneratedSalesScript } from "@/types/sales-script";

export const salesScriptKeys = {
  byConversation: (id: string) => ["leads", "script", id] as const,
};

export function useSalesScript(conversationId: string, enabled = true) {
  return useQuery({
    queryKey: salesScriptKeys.byConversation(conversationId),
    queryFn: () =>
      advisorApiGet<GeneratedSalesScript | null>(
        `/api/leads/script?conversationId=${encodeURIComponent(conversationId)}`,
      ),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 15_000,
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
