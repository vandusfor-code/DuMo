"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api-client";
import type { AdminPendientesFilters, AdminPendientesResult } from "@/types/admin-pendientes";

function buildParams(filters: AdminPendientesFilters): URLSearchParams {
  return new URLSearchParams({
    search: filters.search,
    type: filters.type,
    advisor: filters.advisor,
    dateRange: filters.dateRange,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
}

export function useAdminPendientes(filters: AdminPendientesFilters) {
  const params = buildParams(filters);
  return useQuery({
    queryKey: ["admin", "pendientes", filters],
    queryFn: () => apiGet<AdminPendientesResult>(`/api/admin/pendientes?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function useTransferPendiente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; advisorId: string }) =>
      apiPatch("/api/admin/pendientes", { action: "transfer", ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "pendientes"] });
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
  });
}
