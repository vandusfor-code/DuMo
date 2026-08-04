/** Shared primitives used across the domain. */

export type SaleStatus = "completed" | "pending" | "cancelled";

/** A single point in a time-series chart. */
export type ChartPoint = {
  label: string;
  value: number;
};
