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
}

export interface AdvisorsSummary {
  total: number;
  active: number;
  totalSalesMonth: number;
  avgConversion: number;
}

export interface AdvisorsResult {
  summary: AdvisorsSummary;
  rows: AdvisorPerformance[];
}
