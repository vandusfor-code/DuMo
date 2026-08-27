import type { AdminPendienteDisplayStatus } from "@/types/admin-pendientes";

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

export function computePendienteDisplayStatus(followUpDate: string): AdminPendienteDisplayStatus {
  const today = startOfToday();
  const target = parseDateOnly(followUpDate);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays < 0) return "atrasado";
  if (diffDays <= 3) return "proximo";
  return "activo";
}

export function formatFollowUpDateLabel(followUpDate: string): string {
  const today = startOfToday();
  const target = parseDateOnly(followUpDate);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "En 1 día";
  if (diffDays > 1) return `En ${diffDays} días`;
  if (diffDays === -1) return "Hace 1 día";
  return `Hace ${Math.abs(diffDays)} días`;
}

export function isFollowUpOverdue(followUpDate: string): boolean {
  return parseDateOnly(followUpDate) < startOfToday();
}

export const PENDIENTE_STATUS_LABELS: Record<AdminPendienteDisplayStatus, string> = {
  activo: "Activo",
  proximo: "Próximo",
  atrasado: "Atrasado",
};

/** Slugs agrupados para tarjetas resumen. */
export const PENDIENTES_SUMMARY_GROUPS = {
  deuda: ["deuda", "deuda_wom", "deuda_compania_donante"],
  permanencia: ["permanencia"],
  seguimiento: ["seguimiento", "pendiente", "reagenda"],
} as const;
