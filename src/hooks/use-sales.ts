"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api-client";
import type { NewSaleInput, SaleDetail, SaleSummary } from "@/types/sale";

export const salesKeys = {
  all: ["sales"] as const,
  list: () => [...salesKeys.all, "list"] as const,
  detail: (id: string) => [...salesKeys.all, "detail", id] as const,
};

export function useSales() {
  return useQuery({
    queryKey: salesKeys.list(),
    queryFn: () => apiGet<SaleSummary[]>("/api/sales"),
    retry: 2,
    staleTime: 30_000,
    placeholderData: [],
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: () => apiGet<SaleDetail>(`/api/sales/${id}`),
    enabled: Boolean(id),
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
