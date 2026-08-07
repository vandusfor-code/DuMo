"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPost, apiPostForm } from "@/lib/api-client";
import { advisorApiGet } from "@/lib/advisor-query";
import { salesScriptKeys } from "@/hooks/use-sales-script";
import { latestGestionKeys } from "@/hooks/use-latest-gestion";
import { crmClientKeys } from "@/hooks/use-crm-clients";
import { salesKeys } from "@/hooks/use-sales";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { Plan, SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";

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

export function useSaveLead(conversationId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveLeadInput) => apiPost<SaveLeadResult>("/api/leads", input),
    onSuccess: (result) => {
      if (!conversationId) return;
      if (result.script) {
        queryClient.setQueryData(salesScriptKeys.byConversation(conversationId), result.script);
      } else {
        queryClient.invalidateQueries({ queryKey: salesScriptKeys.byConversation(conversationId) });
      }
      queryClient.invalidateQueries({ queryKey: latestGestionKeys.byConversation(conversationId) });
      if (result.sale) {
        queryClient.invalidateQueries({ queryKey: salesKeys.all });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }
      queryClient.invalidateQueries({ queryKey: crmClientKeys.all });
    },
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

export function useSendMediaMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { to: string; file: File; caption?: string }) => {
      const form = new FormData();
      form.append("file", input.file);
      form.append("conversationId", conversationId ?? "");
      form.append("to", input.to);
      if (input.caption) form.append("caption", input.caption);
      return apiPostForm<{ ok: boolean; id: string }>("/api/whatsapp/send-media", form);
    },
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: leadKeys.messages(conversationId) });
      }
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
    },
  });
}
