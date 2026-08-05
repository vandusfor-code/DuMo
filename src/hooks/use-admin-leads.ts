"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import type {
  AdminAdvisor,
  AdminConversation,
  AdminLeadDetail,
  AssignAdvisorInput,
  UpsertLeadNoteInput,
} from "@/types/admin-lead";
import type { ChatMessage } from "@/types/conversation";
import type { Lead, SaveLeadInput } from "@/types/lead";

export function useAdminConversations() {
  return useQuery({
    queryKey: ["admin", "leads", "conversations"],
    queryFn: () => apiGet<AdminConversation[]>("/api/admin/leads"),
    refetchInterval: 5000,
    retry: 1,
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
    refetchInterval: 2000,
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

export function useSaveAdminLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveLeadInput) => apiPost<Lead>("/api/admin/leads", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "leads"] }),
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
