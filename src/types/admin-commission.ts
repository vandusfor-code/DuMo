export type AdminCommissionStatus = "pending" | "paid";

export const ADMIN_COMMISSION_STATUS_LABELS: Record<AdminCommissionStatus, string> = {
  pending: "Pendiente",
  paid: "Pagada",
};

export interface AdminCommissionAdvisor {
  id: string;
  name: string;
  avatarUrl?: string;
  registeredSales: number;
  finalizedSales: number;
  calculatedCommission: number;
  status: AdminCommissionStatus;
  paymentDate: string | null;
}

export interface AdminCommissionSummary {
  pendingTotal: number;
  paidTotal: number;
  finalizedSales: number;
  totalToPay: number;
}

export interface AdminCommissionFilters {
  month: string;
  year: string;
  advisor: string;
  status: AdminCommissionStatus | "all";
}

export interface AdminCommissionResult {
  summary: AdminCommissionSummary;
  rows: AdminCommissionAdvisor[];
}

export interface AdminCommissionSaleDetail {
  saleId: string;
  customerName: string;
  date: string;
  plan: string;
  lines: number;
  operatorValue: number;
  commission: number;
}

export interface AdminCommissionPaymentHistory {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface AdminCommissionDetail {
  advisor: AdminCommissionAdvisor;
  sales: AdminCommissionSaleDetail[];
  totalCommission: number;
  calculatedAt: string;
  paymentHistory: AdminCommissionPaymentHistory[];
}
