"use client";

import { useQuery } from "@tanstack/react-query";
import { advisorApiGet } from "@/lib/advisor-query";
import type { CrmClient, CrmClientFilters } from "@/types/crm-client";

export const crmClientKeys = {
  all: ["crm-clients"] as const,
  list: (filters: CrmClientFilters) => [...crmClientKeys.all, "list", filters] as const,
};

function buildQuery(filters: CrmClientFilters) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.from?.trim()) params.set("from", filters.from.trim());
  if (filters.to?.trim()) params.set("to", filters.to.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useCrmClients(filters: CrmClientFilters = {}) {
  return useQuery({
    queryKey: crmClientKeys.list(filters),
    queryFn: () => advisorApiGet<CrmClient[]>(`/api/clients${buildQuery(filters)}`),
    staleTime: 15_000,
    retry: 2,
  });
}

export function useAdminCrmClients(filters: CrmClientFilters = {}) {
  return useQuery({
    queryKey: [...crmClientKeys.list(filters), "admin"] as const,
    queryFn: async () => {
      const res = await fetch(`/api/admin/clients${buildQuery(filters)}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      return (await res.json()) as CrmClient[];
    },
    staleTime: 15_000,
    retry: 2,
  });
}
