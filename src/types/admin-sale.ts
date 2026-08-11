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
  id: string;
  date: string;
  time: string;
  customerName: string;
  rut: string;
  advisor: string;
  type: AdminSaleType;
  plan: string;
  /** Precio WOM al cliente — referencia comercial. */
  womValue: number;
  /** Ingreso DuMo (lo que paga WOM) — base contable admin. */
  dumoValue: number;
  status: AdminSaleStatus;
  lines: number;
  /** DUO-4/5 — viene de Operación Duo: comisión partida + badge visual. */
  isDuo?: boolean;
  /** Comisión fija de esta venta (asesora de origen cobra la mitad); null/undefined = fórmula normal. */
  commissionOverride?: number | null;
}

export interface AdminSalesFilters {
  search: string;
  status: AdminSaleStatus | "all";
  advisor: string | "all";
  type: AdminSaleType | "all";
  dateFrom?: string;
  dateTo?: string;
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
