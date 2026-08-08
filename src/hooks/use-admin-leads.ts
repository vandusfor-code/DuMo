"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPostForm, apiPut } from "@/lib/api-client";
import type {
  AdminAdvisor,
  AdminConversation,
  AdminLeadDetail,
  AssignAdvisorInput,
  UpsertLeadNoteInput,
} from "@/types/admin-lead";
import type { ChatMessage } from "@/types/conversation";
import type { SaveLeadInput } from "@/types/lead";
import type { SaveLeadResult } from "@/types/sales-script";

export function useAdminConversations() {
  return useQuery({
    queryKey: ["admin", "leads", "conversations"],
    queryFn: () => apiGet<AdminConversation[]>("/api/admin/leads"),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    staleTime: 5000,
    retry: 2,
    placeholderData: (prev) => prev,
  });
}

export function useAdminAdvisors() {
  return useQuery({
    queryKey: ["admin", "leads", "advisors"],
    queryFn: () => apiGet<AdminAdvisor[]>("/api/admin/leads?advisors=1"),
  });
}

export function useAdminLeadDetail(conversationId: string | null) {
  return useQuery({
    queryKey: ["admin", "leads", "detail", conversationId],
    queryFn: () => apiGet<AdminLeadDetail>(`/api/admin/leads?conversationId=${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useAdminMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["admin", "leads", "messages", conversationId],
    queryFn: () => apiGet<ChatMessage[]>(`/api/admin/leads?conversationId=${conversationId}&messages=1`),
    enabled: !!conversationId,
    refetchInterval: 3000,
    // Sin reintentos infinitos: si falla, se muestra el error de inmediato en
    // vez de quedarse cargando (el polling vuelve a intentarlo igual).
    retry: 1,
    retryDelay: 1000,
  });
}

export function useAssignAdvisor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AssignAdvisorInput) =>
      apiPost<AdminConversation>("/api/admin/leads", { action: "assign", ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
  });
}

export function useSaveAdminLead(conversationId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveLeadInput) => apiPost<SaveLeadResult>("/api/admin/leads", input),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      if (result.script && conversationId) {
        qc.setQueryData(["leads", "script", conversationId], result.script);
      }
    },
  });
}

export function useAddLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertLeadNoteInput) =>
      apiPost("/api/admin/leads", { action: "addNote", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });
}

export function useUpdateLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      apiPut("/api/admin/leads", { id, text }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });
}

export function useDeleteLeadNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/leads?noteId=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });
}

/** Borra una conversación con todo su historial. */
export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) =>
      apiDelete<{ ok: boolean }>(
        `/api/admin/leads?conversationId=${encodeURIComponent(conversationId)}`,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });
}

/** Borra TODAS las conversaciones. Irreversible. */
export function useDeleteAllConversations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiDelete<{ ok: boolean; deleted: number }>(
        "/api/admin/leads?allConversations=1&confirm=BORRAR-TODO",
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
  });
}

export function useAutoAssignSettings() {
  return useQuery({
    queryKey: ["admin", "leads", "auto-assign"],
    queryFn: () => apiGet<{ enabled: boolean; lastAdvisorIndex: number }>("/api/admin/leads?settings=1"),
  });
}

export function useSetAutoAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiPost<{ enabled: boolean; lastAdvisorIndex: number }>("/api/admin/leads", {
        action: "setAutoAssign",
        enabled,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads", "auto-assign"] }),
  });
}

export function useAdminSendMessage(conversationId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { to: string; text: string }) =>
      apiPost<{ ok: boolean; id: string }>("/api/whatsapp/send", {
        conversationId,
        to: input.to,
        text: input.text,
      }),
    onSuccess: () => {
      if (conversationId) {
        qc.invalidateQueries({ queryKey: ["admin", "leads", "messages", conversationId] });
      }
      qc.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
    },
  });
}

export function useAdminSendMediaMessage(conversationId: string | null) {
  const qc = useQueryClient();
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
        qc.invalidateQueries({ queryKey: ["admin", "leads", "messages", conversationId] });
      }
      qc.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
    },
  });
}
