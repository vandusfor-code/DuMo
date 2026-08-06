"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { GeneratedSalesScript } from "@/types/sales-script";

export const salesScriptKeys = {
  byConversation: (id: string) => ["leads", "script", id] as const,
};

export function useSalesScript(conversationId: string, enabled = true) {
  return useQuery({
    queryKey: salesScriptKeys.byConversation(conversationId),
    queryFn: () =>
      apiGet<GeneratedSalesScript | null>(
        `/api/leads/script?conversationId=${encodeURIComponent(conversationId)}`,
      ),
    enabled: Boolean(conversationId) && enabled,
    staleTime: 30_000,
  });
}
