"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "@/lib/api-client";
import { ADVISOR_QUERY_OPTIONS, advisorApiGet } from "@/lib/advisor-query";
import type { NewSaleInput, SaleDetail, SaleSummary } from "@/types/sale";

export const salesKeys = {
  all: ["sales"] as const,
  list: () => [...salesKeys.all, "list"] as const,
  detail: (id: string) => [...salesKeys.all, "detail", id] as const,
};

export function useSales() {
  return useQuery({
    queryKey: salesKeys.list(),
    queryFn: () => advisorApiGet<SaleSummary[]>("/api/sales"),
    placeholderData: [],
    ...ADVISOR_QUERY_OPTIONS,
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => advisorApiGet<SaleDetail | null>(`/api/sales/${id}`),
    enabled: Boolean(id),
    ...ADVISOR_QUERY_OPTIONS,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewSaleInput) =>
      apiPost<SaleDetail>("/api/sales", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiDelete(`/api/sales/${encodeURIComponent(id)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
    },
  });
}
