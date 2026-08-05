"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { AdminSalesFilters, AdminSalesResult } from "@/types/admin-sale";

export function useAdminSales(filters: AdminSalesFilters) {
  const params = new URLSearchParams({
    search: filters.search,
    status: filters.status,
    advisor: filters.advisor,
    type: filters.type,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  return useQuery({
    queryKey: ["admin", "sales", filters],
    queryFn: () => apiGet<AdminSalesResult>(`/api/admin/sales?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
}
