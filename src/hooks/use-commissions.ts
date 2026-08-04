"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { Commission } from "@/types/commission";

export const commissionsKeys = {
  all: ["commissions"] as const,
  byMonth: (month: string) => [...commissionsKeys.all, month] as const,
};

/** Commissions for a given month (yyyy-mm). */
export function useCommissions(month: string) {
  return useQuery({
    queryKey: commissionsKeys.byMonth(month),
    queryFn: () =>
      apiGet<Commission[]>(`/api/commissions?month=${encodeURIComponent(month)}`),
  });
}
