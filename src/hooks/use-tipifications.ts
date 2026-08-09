"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import type {
  CreateTipificationInput,
  Tipification,
  TipificationDeleteCheck,
  TipificationWithUsage,
  UpdateTipificationInput,
} from "@/types/tipification";

export function useTipificationsAdmin() {
  return useQuery({
    queryKey: ["admin", "tipifications"],
    queryFn: () => apiGet<TipificationWithUsage[]>("/api/admin/tipifications"),
  });
}

export function useTipificationDeleteCheck(id: string | null) {
  return useQuery({
    queryKey: ["admin", "tipifications", "delete-check", id],
    queryFn: () =>
      apiGet<TipificationDeleteCheck>(
        `/api/admin/tipifications?id=${encodeURIComponent(id!)}`,
      ),
    enabled: Boolean(id),
  });
}

export function useCreateTipification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTipificationInput) =>
      apiPost<Tipification>("/api/admin/tipifications", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tipifications"] }),
  });
}

export function useUpdateTipification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTipificationInput }) =>
      apiPut<Tipification>("/api/admin/tipifications", { id, data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tipifications"] }),
  });
}

export function useDeleteTipification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      reassignToId,
    }: {
      id: string;
      reassignToId?: string;
    }) => {
      const qs = new URLSearchParams({ id });
      if (reassignToId) qs.set("reassignToId", reassignToId);
      return apiDelete<{ ok: boolean }>(`/api/admin/tipifications?${qs.toString()}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tipifications"] }),
  });
}
