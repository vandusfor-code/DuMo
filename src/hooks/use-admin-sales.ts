"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch } from "@/lib/api-client";
import type { AdminSaleStatus, AdminSalesFilters, AdminSalesResult } from "@/types/admin-sale";
import type { SaleDetail } from "@/types/sale";

function buildParams(filters: AdminSalesFilters): URLSearchParams {
  const params = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    advisor: filters.advisor,
    type: filters.type,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params;
}

export function useAdminSales(filters: AdminSalesFilters) {
  const params = buildParams(filters);
  return useQuery({
    queryKey: ["admin", "sales", filters],
    queryFn: () => apiGet<AdminSalesResult>(`/api/admin/sales?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function useAdminSaleDetail(id: string | null) {
  return useQuery({
    queryKey: ["admin", "sales", "detail", id],
    queryFn: () => apiGet<SaleDetail>(`/api/admin/sales/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
  });
}

export function useUpdateAdminSaleStatuses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { ids: string[]; status: AdminSaleStatus }) =>
      apiPatch("/api/admin/sales", { action: "setStatus", ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteAdminSales() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiDelete(`/api/admin/sales?ids=${encodeURIComponent(ids.join(","))}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
