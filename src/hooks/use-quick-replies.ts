"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import { leadKeys } from "@/hooks/use-leads";
import type {
  CreateQuickReplyCategoryInput,
  CreateQuickReplyTemplateInput,
  QuickReplyCategory,
  QuickReplyTag,
  QuickReplyTemplate,
  UpdateQuickReplyTemplateInput,
} from "@/types/quick-reply";
import type { MediaAsset } from "@/types/media";

export function useQuickReplyCategories() {
  return useQuery({
    queryKey: ["admin", "plantillas", "categories"],
    queryFn: () => apiGet<QuickReplyCategory[]>("/api/admin/plantillas?section=categories"),
  });
}

export function useQuickReplyTags() {
  return useQuery({
    queryKey: ["admin", "plantillas", "tags"],
    queryFn: () => apiGet<QuickReplyTag[]>("/api/admin/plantillas?section=tags"),
  });
}

export function useQuickReplyTemplates(filters?: {
  q?: string;
  categoryId?: string;
  tagId?: string;
  includeDeleted?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.q) params.set("q", filters.q);
  if (filters?.categoryId) params.set("categoryId", filters.categoryId);
  if (filters?.tagId) params.set("tagId", filters.tagId);
  if (filters?.includeDeleted) params.set("includeDeleted", "1");
  const qs = params.toString();

  return useQuery({
    queryKey: ["admin", "plantillas", filters],
    queryFn: () => apiGet<QuickReplyTemplate[]>(`/api/admin/plantillas${qs ? `?${qs}` : ""}`),
  });
}

export function useCreateQuickReplyCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuickReplyCategoryInput) =>
      apiPost<QuickReplyCategory>("/api/admin/plantillas", { section: "category", data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plantillas"] });
    },
  });
}

export function useCreateQuickReplyTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiPost<QuickReplyTag>("/api/admin/plantillas", { section: "tag", name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plantillas", "tags"] }),
  });
}

export function useCreateQuickReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuickReplyTemplateInput) =>
      apiPost<QuickReplyTemplate>("/api/admin/plantillas", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plantillas"] }),
  });
}

export function useUpdateQuickReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuickReplyTemplateInput }) =>
      apiPut<QuickReplyTemplate>("/api/admin/plantillas", { id, data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plantillas"] }),
  });
}

export function useDeleteQuickReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/plantillas?id=${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plantillas"] }),
  });
}

export function useRestoreQuickReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiPut<QuickReplyTemplate>("/api/admin/plantillas", { id, action: "restore" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plantillas"] }),
  });
}

export function useUploadTemplateMedia() {
  return useMutation({
    mutationFn: async ({ file, categoryId }: { file: File; categoryId: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("categoryId", categoryId);
      const res = await fetch("/api/admin/plantillas/upload", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = (await res.json()) as MediaAsset & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Error al subir.");
      return json;
    },
  });
}

export function useAdvisorQuickReplies() {
  return useQuery({
    queryKey: ["leads", "plantillas"],
    queryFn: () => apiGet<import("@/types/quick-reply").AdvisorQuickReplyTemplate[]>("/api/leads/plantillas"),
    staleTime: 30_000,
  });
}

export function useSendQuickReplyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      templateId: string;
      conversationId: string;
      to: string;
      customerName?: string;
    }) =>
      apiPost<{ mode: "insert" | "sent"; text?: string; sentCount?: number }>(
        `/api/leads/plantillas/${encodeURIComponent(input.templateId)}/send`,
        input,
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: leadKeys.messages(variables.conversationId) });
      qc.invalidateQueries({ queryKey: leadKeys.conversations });
      qc.invalidateQueries({ queryKey: ["leads", "plantillas"] });
    },
  });
}
