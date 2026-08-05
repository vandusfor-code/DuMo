"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import { ADVISOR_QUERY_OPTIONS, advisorApiGet } from "@/lib/advisor-query";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";

export const leadKeys = {
  conversations: ["leads", "conversations"] as const,
  messages: (id: string) => ["leads", "messages", id] as const,
  plans: ["leads", "plans"] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: leadKeys.conversations,
    queryFn: () => advisorApiGet<Conversation[]>("/api/leads/conversations"),
    // Sincronización casi instantánea de la bandeja.
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 2,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: leadKeys.messages(conversationId ?? ""),
    queryFn: () =>
      advisorApiGet<ChatMessage[]>(
        `/api/leads/conversations/${conversationId}/messages`,
      ),
    enabled: Boolean(conversationId),
    // El chat abierto se refresca más seguido que la bandeja.
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 2,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: leadKeys.plans,
    queryFn: () => advisorApiGet<Plan[]>("/api/leads/plans"),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function useSaveLead() {
  return useMutation({
    mutationFn: (input: SaveLeadInput) => apiPost<Lead>("/api/leads", input),
  });
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { to: string; text: string }) =>
      apiPost<{ ok: boolean; id: string }>("/api/whatsapp/send", {
        conversationId,
        to: input.to,
        text: input.text,
      }),
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: leadKeys.messages(conversationId) });
      }
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
    },
  });
}
