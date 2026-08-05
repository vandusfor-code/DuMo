"use client";

import { useQuery } from "@tanstack/react-query";
import { EMPTY_ADVISOR_DASHBOARD } from "@/data/advisor-fallbacks";
import { ADVISOR_QUERY_OPTIONS, advisorApiGet } from "@/lib/advisor-query";
import type { DashboardData } from "@/types/dashboard";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => advisorApiGet<DashboardData>("/api/dashboard"),
    placeholderData: EMPTY_ADVISOR_DASHBOARD,
    ...ADVISOR_QUERY_OPTIONS,
  });
}
