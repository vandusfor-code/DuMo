export type AdminSaleStatus =
  | "registrada"
  | "en_reparto"
  | "finalizada"
  | "rechazada"
  | "cancelada";

export const ADMIN_SALE_STATUS_LABELS: Record<AdminSaleStatus, string> = {
  registrada: "Registrada",
  en_reparto: "En reparto",
  finalizada: "Finalizada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

export type AdminSaleType =
  | "portabilidad"
  | "renovacion"
  | "linea_nueva"
  | "migracion";

export const ADMIN_SALE_TYPE_LABELS: Record<AdminSaleType, string> = {
  portabilidad: "Portabilidad",
  renovacion: "Renovación",
  linea_nueva: "Línea Nueva",
  migracion: "Migración",
};

export interface AdminSale {
  id: string; // "#VTA-0982"
  date: string; // "03/08/2025"
  time: string; // "10:24 am"
  customerName: string;
  rut: string;
  advisor: string;
  type: AdminSaleType;
  plan: string;
  operatorValue: number;
  status: AdminSaleStatus;
  lines: number;
}

export interface AdminSalesFilters {
  search: string;
  status: AdminSaleStatus | "all";
  advisor: string | "all";
  type: AdminSaleType | "all";
  page: number;
  pageSize: number;
}

export interface AdminSalesSummary {
  total: number;
  registrada: number;
  en_reparto: number;
  finalizada: number;
  rechazada: number;
  cancelada: number;
}

export interface AdminSalesResult {
  rows: AdminSale[];
  total: number;
  summary: AdminSalesSummary;
}
