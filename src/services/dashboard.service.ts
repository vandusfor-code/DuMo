import "server-only";
import { getDashboardRepository } from "@/repositories/dashboard.repository";
import type { DashboardData } from "@/types/dashboard";

/**
 * Business layer for the dashboard. Route handlers call the service; the
 * service resolves the active repository (Sheets or mock) and orchestrates it.
 */
export const dashboardService = {
  getDashboard(): Promise<DashboardData> {
    return getDashboardRepository().getDashboard();
  },
};
