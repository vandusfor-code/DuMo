import "server-only";
import type { AdminDashboardData } from "@/types/admin-dashboard";
import { ADMIN_DASHBOARD_MOCK } from "@/data/mock/admin-dashboard.mock";
import { withLatency } from "@/lib/mock";

export interface AdminDashboardRepository {
  getDashboard(): Promise<AdminDashboardData>;
}

class MockAdminDashboardRepository implements AdminDashboardRepository {
  getDashboard() {
    return withLatency(ADMIN_DASHBOARD_MOCK);
  }
}

import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { hasDatabase } from "@/server/db/client";

export function getAdminDashboardRepository(): AdminDashboardRepository {
  if (hasDatabase()) {
    const store = getPostgresSalesStore();
    return { getDashboard: () => store.getAdminDashboard() };
  }
  return new MockAdminDashboardRepository();
}
