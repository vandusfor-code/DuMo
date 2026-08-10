"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { advisorApiGet, advisorApiPost, advisorApiPostForm, AdvisorFetchError } from "@/lib/advisor-query";
import { salesScriptKeys } from "@/hooks/use-sales-script";
import { latestGestionKeys } from "@/hooks/use-latest-gestion";
import { crmClientKeys } from "@/hooks/use-crm-clients";
import { salesKeys } from "@/hooks/use-sales";
import { recuperacionKeys } from "@/hooks/use-advisor-recuperacion";
import { REALTIME_FALLBACK_POLL_MS } from "@/providers/realtime-provider";
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

export function patchConversationUnread(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  queryClient.setQueryData<Conversation[]>(leadKeys.conversations, (prev) =>
    prev?.map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c)),
  );
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      advisorApiPost<{ ok: boolean }>(
        `/api/leads/conversations/${encodeURIComponent(conversationId)}/read`,
        {},
      ),
    onMutate: (conversationId) => {
      patchConversationUnread(queryClient, conversationId);
    },
    onSettled: (_data, _err, conversationId) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: leadKeys.messages(conversationId) });
      }
    },
  });
}

/** No conservar bandeja/mensajes tras 401/403 — evita mostrar datos de otra sesión. */
function keepPlaceholderOnAuthError<T>(
  prev: T | undefined,
  prevQuery: { state: { error: unknown } } | undefined,
): T | undefined {
  const err = prevQuery?.state.error;
  if (err instanceof AdvisorFetchError && (err.status === 401 || err.status === 403)) {
    return undefined;
  }
  return prev;
}

export function useConversations() {
  return useQuery({
    queryKey: leadKeys.conversations,
    queryFn: fetchAdvisorConversations,
    refetchInterval: REALTIME_FALLBACK_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 3000,
    retry: 2,
    placeholderData: keepPlaceholderOnAuthError,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: leadKeys.messages(conversationId ?? ""),
    queryFn: () => fetchConversationMessages(conversationId!),
    enabled: Boolean(conversationId),
    refetchInterval: REALTIME_FALLBACK_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 2000,
    retry: 2,
    placeholderData: keepPlaceholderOnAuthError,
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
    mutationFn: (input: SaveLeadInput) => advisorApiPost<SaveLeadResult>("/api/leads", input),
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
        queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "sales"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "accounting"] });
        queryClient.invalidateQueries({ queryKey: ["admin", "commissions"] });
        queryClient.invalidateQueries({ queryKey: ["commissions"] });
      }
      queryClient.invalidateQueries({ queryKey: crmClientKeys.all });
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
      queryClient.invalidateQueries({ queryKey: recuperacionKeys.all });
      if (result.saveAction === "close") {
        queryClient.invalidateQueries({ queryKey: ["admin", "pendientes"] });
      }
    },
  });
}

export function useSendMessage(conversationId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { to: string; text: string }) =>
      advisorApiPost<{ ok: boolean; id: string }>("/api/whatsapp/send", {
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
      return advisorApiPostForm<{ ok: boolean; id: string }>("/api/whatsapp/send-media", form);
    },
    onSuccess: () => {
      if (conversationId) {
        queryClient.invalidateQueries({ queryKey: leadKeys.messages(conversationId) });
      }
      queryClient.invalidateQueries({ queryKey: leadKeys.conversations });
    },
  });
}
