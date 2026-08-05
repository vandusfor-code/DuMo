import type { DashboardData } from "@/types/dashboard";

const now = new Date();
const monthName = new Intl.DateTimeFormat("es-CL", { month: "long" }).format(now);
const monthLabel = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${now.getFullYear()}`;
const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" });

/** Dashboard vacío para asesora — nunca mostrar pantalla de error. */
export const EMPTY_ADVISOR_DASHBOARD: DashboardData = {
  dailySales: {
    count: 0,
    goal: 0,
    dateLabel: `Hoy, ${dateFmt.format(now)}`,
    series: [],
  },
  monthlySales: {
    count: 0,
    goal: 0,
    monthLabel,
    series: [],
  },
  commission: {
    estimated: 0,
    generated: 0,
    paid: 0,
  },
  recentSales: [],
  quickSummary: {
    dailySales: 0,
    monthlySales: 0,
    newClients: 0,
    pending: 0,
  },
  monthlyProgress: 0,
};
