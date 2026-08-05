import "server-only";
import type { SaleStatus } from "@/types/common";
import type { AdminSaleStatus, AdminSaleType } from "@/types/admin-sale";
import type { SaleType } from "@/types/sale";
import { formatShortDate } from "@/lib/format";

export function toAdvisorStatus(adminStatus: string): SaleStatus {
  switch (adminStatus) {
    case "finalizada":
      return "completed";
    case "rechazada":
    case "cancelada":
      return "cancelled";
    default:
      return "pending";
  }
}

export function toAdminSaleType(value: string): AdminSaleType {
  const v = value as AdminSaleType;
  if (
    v === "portabilidad" ||
    v === "renovacion" ||
    v === "linea_nueva" ||
    v === "migracion"
  ) {
    return v;
  }
  return "portabilidad";
}

export function canonicalToAdminType(type: SaleType): AdminSaleType {
  switch (type) {
    case "portability":
    case "portability_device":
      return "portabilidad";
    case "device_renewal":
      return "renovacion";
    case "new_line":
      return "linea_nueva";
    case "migration":
      return "migracion";
    default:
      return "portabilidad";
  }
}

export function adminTypeToCanonical(type: AdminSaleType): SaleType {
  switch (type) {
    case "portabilidad":
      return "portability";
    case "renovacion":
      return "device_renewal";
    case "linea_nueva":
      return "new_line";
    case "migracion":
      return "migration";
    default:
      return "portability";
  }
}

export function toCanonicalSaleType(value: string): SaleType {
  const admin = toAdminSaleType(value);
  return adminTypeToCanonical(admin);
}

/** ISO date (yyyy-mm-dd) or Date → dd/mm/yyyy for tablas admin. */
export function toAdminDate(value: string | Date): string {
  if (value instanceof Date) {
    const iso = value.toISOString().slice(0, 10);
    return formatShortDate(iso);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return formatShortDate(value.slice(0, 10));
  }
  return value;
}

export function toAdminTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function adminDateInPeriod(
  adminDate: string,
  month: string,
  year: string,
): boolean {
  const [, m, y] = adminDate.split("/");
  return m === month.padStart(2, "0") && y === year;
}

export function isoDateInMonth(isoDate: string, monthKey?: string): boolean {
  if (!monthKey) return true;
  return isoDate.startsWith(monthKey);
}

export const ADMIN_STATUS_LABELS: Record<AdminSaleStatus, string> = {
  registrada: "Registrada",
  en_reparto: "En reparto",
  finalizada: "Finalizada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
};

export const ADMIN_TYPE_LABELS: Record<AdminSaleType, string> = {
  portabilidad: "Portabilidad",
  renovacion: "Renovación",
  linea_nueva: "Línea Nueva",
  migracion: "Migración",
};
