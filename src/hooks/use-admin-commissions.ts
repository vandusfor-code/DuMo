"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api-client";
import type {
  AdminCommissionDetail,
  AdminCommissionFilters,
  AdminCommissionResult,
} from "@/types/admin-commission";

function toParams(filters: AdminCommissionFilters) {
  return new URLSearchParams({
    month: filters.month,
    year: filters.year,
    advisor: filters.advisor,
    status: filters.status,
  });
}

export function useAdminCommissions(filters: AdminCommissionFilters) {
  return useQuery({
    queryKey: ["admin", "commissions", filters],
    queryFn: () => apiGet<AdminCommissionResult>(`/api/admin/commissions?${toParams(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCommissionDetail(advisorId: string, filters: AdminCommissionFilters) {
  const params = toParams(filters);
  params.set("advisorId", advisorId);
  return useQuery({
    queryKey: ["admin", "commissions", "detail", advisorId, filters],
    queryFn: () => apiGet<AdminCommissionDetail>(`/api/admin/commissions?${params}`),
    enabled: !!advisorId,
  });
}

export function useMarkCommissionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ advisorId, filters }: { advisorId: string; filters: AdminCommissionFilters }) =>
      apiPatch("/api/admin/commissions", { action: "markPaid", advisorId, filters }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "commissions"] }),
  });
}
