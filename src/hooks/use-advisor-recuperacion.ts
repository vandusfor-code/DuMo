"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { advisorApiGet } from "@/lib/advisor-query";
import { REALTIME_FALLBACK_POLL_MS } from "@/providers/realtime-provider";
import type { AdvisorRecuperacionFilters, AdvisorRecuperacionResult } from "@/types/advisor-recuperacion";

export const recuperacionKeys = {
  all: ["dashboard", "recuperacion"] as const,
  list: (filters: AdvisorRecuperacionFilters) => ["dashboard", "recuperacion", filters] as const,
  count: ["dashboard", "recuperacion", "count"] as const,
};

function buildParams(filters: AdvisorRecuperacionFilters): URLSearchParams {
  return new URLSearchParams({
    search: filters.search,
    type: filters.type,
    dateRange: filters.dateRange,
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
}

export function useAdvisorRecuperacion(filters: AdvisorRecuperacionFilters) {
  const params = buildParams(filters);
  return useQuery({
    queryKey: recuperacionKeys.list(filters),
    queryFn: () =>
      advisorApiGet<AdvisorRecuperacionResult>(`/api/dashboard/recuperacion?${params.toString()}`),
    placeholderData: keepPreviousData,
    refetchInterval: REALTIME_FALLBACK_POLL_MS,
    staleTime: 3000,
  });
}

export function useRecuperacionCount() {
  return useQuery({
    queryKey: recuperacionKeys.count,
    queryFn: async () => {
      const params = new URLSearchParams({
        search: "",
        type: "all",
        dateRange: "all",
        page: "1",
        pageSize: "1",
      });
      const data = await advisorApiGet<AdvisorRecuperacionResult>(
        `/api/dashboard/recuperacion?${params.toString()}`,
      );
      return data.total;
    },
    refetchInterval: REALTIME_FALLBACK_POLL_MS,
    staleTime: 3000,
  });
}
