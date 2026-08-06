"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api-client";
import type { EquipmentCatalogItem, EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";

export function useEquipmentCatalog() {
  return useQuery({
    queryKey: ["admin", "equipment"],
    queryFn: () => apiGet<EquipmentCatalogItem[]>("/api/admin/equipment"),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertEquipmentInput) => apiPost<EquipmentCatalogItem>("/api/admin/equipment", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "equipment"] }),
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, equipment }: { id: string; equipment: UpsertEquipmentInput }) =>
      apiPut<EquipmentCatalogItem>("/api/admin/equipment", { id, equipment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "equipment"] }),
  });
}

export function useSetEquipmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EquipmentStatus }) =>
      apiPatch<EquipmentCatalogItem>("/api/admin/equipment", { action: "setStatus", id, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "equipment"] }),
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete<{ ok: boolean }>(`/api/admin/equipment?id=${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "equipment"] }),
  });
}
