import "server-only";
import { getAdminDashboardRepository } from "@/repositories/admin-dashboard.repository";
import type { AdminDashboardData } from "@/types/admin-dashboard";

export const adminDashboardService = {
  getDashboard(): Promise<AdminDashboardData> {
    return getAdminDashboardRepository().getDashboard();
  },
};
