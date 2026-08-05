import type { ChartPoint } from "./common";
import type { RecentSale } from "./sale";

/** Everything the Inicio dashboard renders, in one payload. */
export interface DashboardData {
  dailySales: {
    count: number;
    goal: number;
    dateLabel: string;
    series: ChartPoint[];
  };
  monthlySales: {
    count: number;
    goal: number;
    monthLabel: string;
    series: ChartPoint[];
  };
  commission: {
    /** Estimated total for the month. */
    estimated: number;
    generated: number;
    paid: number;
  };
  recentSales: RecentSale[];
  quickSummary: {
    dailySales: number;
    monthlySales: number;
    newClients: number;
    pending: number;
  };
  /** Percent of the monthly sales goal reached (0–100). */
  monthlyProgress: number;
  /** Meta económica individual (ingreso DuMo). */
  economicTarget?: {
    current: number;
    goal: number;
    progress: number;
  };
}
