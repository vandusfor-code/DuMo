import "server-only";
import type { SaleStatus } from "@/types/common";
import type { CommissionStatus } from "@/types/commission";
import type { SaleType } from "@/types/sale";

/** Parse an integer cell, defaulting to 0. */
export function toInt(value: string | undefined): number {
  const n = Number.parseInt((value ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

const SALE_STATUSES: SaleStatus[] = ["completed", "pending", "cancelled"];
export function toSaleStatus(value: string | undefined): SaleStatus {
  const v = (value ?? "").trim().toLowerCase();
  return (SALE_STATUSES as string[]).includes(v)
    ? (v as SaleStatus)
    : "pending";
}

export function toCommissionStatus(value: string | undefined): CommissionStatus {
  return (value ?? "").trim().toLowerCase() === "paid" ? "paid" : "pending";
}

const SALE_TYPES: SaleType[] = [
  "portability",
  "portability_device",
  "device_renewal",
  "new_line",
  "migration",
];
export function toSaleType(value: string | undefined): SaleType {
  const v = (value ?? "").trim();
  return (SALE_TYPES as string[]).includes(v)
    ? (v as SaleType)
    : "portability";
}
