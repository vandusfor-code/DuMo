export type AdminPendientesDateRange = "all" | "today" | "next7" | "next30";

export type AdminPendienteDisplayStatus = "activo" | "proximo" | "atrasado";

export interface AdminPendientesFilters {
  search: string;
  type: string;
  advisor: string;
  dateRange: AdminPendientesDateRange;
  page: number;
  pageSize: number;
}

export interface AdminPendienteRow {
  id: string;
  conversationId: string;
  gestionId: string;
  customerName: string;
  phone: string;
  tipificationSlug: string;
  tipificationName: string;
  tipificationBadgeBg: string;
  tipificationBadgeText: string;
  followUpDate: string;
  followUpDateLabel: string;
  originAdvisorId: string | null;
  originAdvisorName: string;
  note: string;
  isOverdue: boolean;
  displayStatus: AdminPendienteDisplayStatus;
}

export interface AdminPendientesSummary {
  totalPending: number;
  deuda: number;
  permanencia: number;
  seguimiento: number;
  byType: { slug: string; name: string; count: number }[];
}

export interface AdminPendientesResult {
  rows: AdminPendienteRow[];
  total: number;
  summary: AdminPendientesSummary;
}
