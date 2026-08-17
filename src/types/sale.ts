import type { SaleStatus } from "./common";

/** Canonical sale types offered by DuMo. */
export type SaleType =
  | "portability"
  | "portability_device"
  | "device_renewal"
  | "new_line"
  | "migration";

/** Human-readable labels (es-CL) for each sale type. */
export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  portability: "Portabilidad",
  portability_device: "Portabilidad + Equipo",
  device_renewal: "Renovación de Equipo",
  new_line: "Línea nueva",
  migration: "Migración",
};

/** Sale types that require a device to be specified. */
export const DEVICE_REQUIRED_TYPES: SaleType[] = [
  "portability_device",
  "device_renewal",
];

/** A sale as summarised in dashboard/list tables. */
export interface SaleSummary {
  id: string;
  customerName: string;
  rut: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  lines: number;
  status: SaleStatus;
  /** DUO-5 — viene de Operación Duo: la comisión de esta venta es la mitad. */
  isDuo?: boolean;
  /** Radicado escrito por la asesora al registrar la venta. */
  folioNumber?: string;
}

/** Extra fields the dashboard's "Últimas ventas" table shows. */
export interface RecentSale extends SaleSummary {
  saleType: SaleType;
  plan: string;
}

/** A single line within a sale (detail view / creation). */
export interface SaleLine {
  phoneNumber: string;
  saleType: SaleType;
  deviceName?: string;
  status: SaleStatus;
}

/** A timeline event in a sale's history. */
export interface SaleHistoryEvent {
  title: string;
  user: string;
  /** ISO datetime. */
  datetime: string;
}

/** Full sale detail, as shown on the Detalle de Venta screen. */
export interface SaleDetail {
  id: string;
  customer: {
    name: string;
    rut: string;
    phone: string;
    email: string;
  };
  advisor: string;
  status: SaleStatus;
  /** ISO date (yyyy-mm-dd). */
  createdAt: string;
  notes: string;
  lines: SaleLine[];
  history: SaleHistoryEvent[];
  /** Radicado escrito por la asesora al registrar la venta. */
  folioNumber?: string;
}

/** Payload accepted when registering a new sale. */
export interface NewSaleInput {
  customerName: string;
  rut: string;
  phone: string;
  email?: string;
  notes?: string;
  /** Radicado escrito por la asesora — obligatorio y único, validado antes de llegar aquí. */
  folioNumber?: string;
  /** Operador (WOM/Claro) elegido en la gestión — decide comisión/reportes. */
  carrier?: string;
  lines: {
    phoneNumber: string;
    saleType: SaleType;
    /** ID del plan comercial (config comercial). */
    planId?: string;
    deviceName?: string;
  }[];
}
