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

/**
 * Fábrica del repositorio. Por ahora mock; cuando existan las variables de
 * Google Sheets se agregará `SheetsAdminDashboardRepository` (derivando los
 * KPIs de Ventas/Comisiones/Contabilidad) y se elige aquí.
 */
export function getAdminDashboardRepository(): AdminDashboardRepository {
  return new MockAdminDashboardRepository();
}
