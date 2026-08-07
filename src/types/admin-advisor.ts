export interface AdvisorPerformance {
  id: string;
  name: string;
  email: string;
  username: string;
  active: boolean;
  avatarUrl: string;
  registeredSales: number;
  finalizedSales: number;
  inDeliverySales: number;
  conversionRate: number;
  /** Meta de ventas del mes asignada por el admin. */
  monthlySalesGoal: number | null;
}

export interface AdvisorsSummary {
  total: number;
  active: number;
  totalSalesMonth: number;
  avgConversion: number;
  teamMonthlyGoal: number;
  assignedGoalsTotal: number;
}

export interface AdvisorsResult {
  summary: AdvisorsSummary;
  rows: AdvisorPerformance[];
}
