import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { getDashboardRepository } from "@/repositories/dashboard.repository";
import type { DashboardData } from "@/types/dashboard";

export const dashboardService = {
  getDashboard(scope?: AdvisorScope | null): Promise<DashboardData> {
    return getDashboardRepository().getDashboard(scope ?? null);
  },
};
