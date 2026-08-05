"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type { AdminDashboardData } from "@/types/admin-dashboard";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiGet<AdminDashboardData>("/api/admin/dashboard"),
    retry: 1,
    staleTime: 30_000,
  });
}
