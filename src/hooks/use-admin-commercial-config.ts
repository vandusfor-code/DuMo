"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type {
  CommercialConfigSnapshot,
  CommercialGlobalSettings,
  CommercialPlan,
  UpsertCommercialPlanInput,
} from "@/types/commercial-config";

export function useCommercialConfig() {
  return useQuery({
    queryKey: ["admin", "commercial-config"],
    queryFn: () => apiGet<CommercialConfigSnapshot>("/api/admin/commercial-config"),
  });
}

export function useUpdateCommercialSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: CommercialGlobalSettings) =>
      apiPost<CommercialGlobalSettings>("/api/admin/commercial-config", {
        action: "updateSettings",
        settings,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commercial-config"] }),
  });
}

export function useCreateCommercialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertCommercialPlanInput) =>
      apiPost<CommercialPlan>("/api/admin/commercial-config", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commercial-config"] }),
  });
}

export function useUpdateCommercialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: UpsertCommercialPlanInput }) =>
      apiPut<CommercialPlan>("/api/admin/commercial-config", { id, plan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commercial-config"] }),
  });
}

export function useDuplicateCommercialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPatch<CommercialPlan>("/api/admin/commercial-config", { action: "duplicate", id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commercial-config"] }),
  });
}

export function useDeleteCommercialPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/commercial-config?id=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commercial-config"] }),
  });
}
