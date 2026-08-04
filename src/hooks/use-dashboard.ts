"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { DashboardData } from "@/types/dashboard";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

/** React Query hook for the Inicio dashboard payload (via /api/dashboard). */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => apiGet<DashboardData>("/api/dashboard"),
  });
}
