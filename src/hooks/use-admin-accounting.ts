"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { AccountingFilters, AccountingResult, CreateExpenseInput, Expense } from "@/types/accounting";

export function useAccounting(filters: AccountingFilters) {
  const params = new URLSearchParams({ month: filters.month, year: filters.year });
  return useQuery({
    queryKey: ["admin", "accounting", filters],
    queryFn: () => apiGet<AccountingResult>(`/api/admin/accounting?${params}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => apiPost<Expense>("/api/admin/accounting", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "accounting"] }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/accounting?id=${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "accounting"] }),
  });
}
