"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import { advisorApiGet } from "@/lib/advisor-query";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Lead, Plan, SaveLeadInput } from "@/types/lead";

export const leadKeys = {
  conversations: ["leads", "conversations"] as const,
  messages: (id: string) => ["leads", "messages", id] as const,
  plans: ["leads", "plans"] as const,
};

/** Bandeja de conversaciones — misma función para Leads y notificaciones. */
export function fetchAdvisorConversations() {
  return advisorApiGet<Conversation[]>("/api/leads/conversations", 18_000);
}

export function fetchConversationMessages(conversationId: string) {
  return advisorApiGet<ChatMessage[]>(
    `/api/leads/conversations/${encodeURIComponent(conversationId)}/messages`,
    18_000,
  );
}

export function useConversations() {
  return useQuery({
    queryKey: leadKeys.conversations,
    queryFn: fetchAdvisorConversations,
    refetchInterval: 6000,
    refetchIntervalInBackground: true,
    staleTime: 3000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: leadKeys.messages(conversationId ?? ""),
    queryFn: () => fetchConversationMessages(conversationId!),
    enabled: Boolean(conversationId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    staleTime: 2000,
    retry: 2,
    placeholderData: (prev) => prev,
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
