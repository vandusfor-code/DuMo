"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
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
    queryFn: () => apiGet<Conversation[]>("/api/leads/conversations"),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: leadKeys.messages(conversationId ?? ""),
    queryFn: () =>
      apiGet<ChatMessage[]>(`/api/leads/conversations/${conversationId}/messages`),
    enabled: Boolean(conversationId),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: leadKeys.plans,
    queryFn: () => apiGet<Plan[]>("/api/leads/plans"),
    staleTime: 5 * 60_000,
  });
}

export function useSaveLead() {
  return useMutation({
    mutationFn: (input: SaveLeadInput) => apiPost<Lead>("/api/leads", input),
  });
}
