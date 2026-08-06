"use client";

import { useQuery } from "@tanstack/react-query";
import { advisorApiGet } from "@/lib/advisor-query";
import type { AdvisorEquipmentOption } from "@/types/equipment";

export function useActiveEquipment() {
  return useQuery({
    queryKey: ["leads", "equipment"],
    queryFn: () => advisorApiGet<AdvisorEquipmentOption[]>("/api/leads/equipment"),
    staleTime: 60_000,
  });
}
