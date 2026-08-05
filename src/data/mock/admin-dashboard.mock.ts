import type { AdminDashboardData } from "@/types/admin-dashboard";

const zero = { value: "0", delta: 0, deltaLabel: "sin datos" };

/** Dashboard vacío — se llena con datos reales de ventas/contabilidad. */
export const ADMIN_DASHBOARD_MOCK: AdminDashboardData = {
  kpis: {
    salesToday: zero,
    finishedToday: zero,
    inDelivery: zero,
    salesMonth: zero,
    conversion: { value: "0%", delta: 0, deltaLabel: "sin datos" },
    profit: { value: "$0", delta: 0, deltaLabel: "sin datos" },
    expenses: { value: "$0", delta: 0, deltaLabel: "sin datos" },
    budgetLeft: { value: "$0", delta: 0, deltaLabel: "sin datos" },
  },
  salesByAdvisor: [],
  salesByDay: [],
  salesByType: [],
  salesByStatus: [],
  alerts: [],
  activity: [],
  monthlyGoal: {
    goal: 0,
    current: 0,
    progress: 0,
    remaining: 0,
    salesNeeded: 0,
  },
};
