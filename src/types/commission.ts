export type CommissionStatus = "paid" | "pending";

export interface Commission {
  id: string;
  saleId: string;
  customerName: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  lines: number;
  amount: number;
  status: CommissionStatus;
  /** ISO date, or null when unpaid. */
  paymentDate: string | null;
}
