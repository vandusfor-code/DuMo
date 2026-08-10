import type {
  AdminPendienteRow,
  AdminPendientesDateRange,
  AdminPendientesResult,
  AdminPendientesSummary,
} from "@/types/admin-pendientes";

export type AdvisorRecuperacionDateRange = AdminPendientesDateRange;

export interface AdvisorRecuperacionFilters {
  search: string;
  type: string;
  dateRange: AdvisorRecuperacionDateRange;
  page: number;
  pageSize: number;
}

export type AdvisorRecuperacionRow = AdminPendienteRow;
export type AdvisorRecuperacionSummary = AdminPendientesSummary;
export type AdvisorRecuperacionResult = AdminPendientesResult;
