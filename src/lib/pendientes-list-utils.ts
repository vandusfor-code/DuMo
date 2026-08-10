import {
  computePendienteDisplayStatus,
  formatFollowUpDateLabel,
  isFollowUpOverdue,
  PENDIENTES_SUMMARY_GROUPS,
} from "@/lib/pendientes-display";
import type {
  AdminPendienteDisplayStatus,
  AdminPendienteRow,
  AdminPendientesDateRange,
  AdminPendientesSummary,
} from "@/types/admin-pendientes";

export type PendientesListRow = {
  id: string;
  conversation_id: string;
  gestion_id: string;
  customer_name: string;
  phone: string;
  tipification_slug: string;
  tipification_name: string | null;
  badge_bg: string | null;
  badge_text: string | null;
  follow_up_date: string;
  origin_advisor_id: string | null;
  origin_advisor_name: string | null;
  advisor_name: string;
  note: string | null;
};

export function mapPendientesListRow(row: PendientesListRow): AdminPendienteRow {
  const followUpDate = row.follow_up_date.slice(0, 10);
  return {
    id: row.id,
    conversationId: row.conversation_id,
    gestionId: row.gestion_id,
    customerName: row.customer_name,
    phone: row.phone,
    tipificationSlug: row.tipification_slug,
    tipificationName: row.tipification_name ?? row.tipification_slug,
    tipificationBadgeBg: row.badge_bg ?? "#eef2ff",
    tipificationBadgeText: row.badge_text ?? "#3730a3",
    followUpDate,
    followUpDateLabel: formatFollowUpDateLabel(followUpDate),
    originAdvisorId: row.origin_advisor_id,
    originAdvisorName: row.origin_advisor_name ?? row.advisor_name ?? "",
    note: row.note?.trim() ?? "",
    isOverdue: isFollowUpOverdue(followUpDate),
    displayStatus: computePendienteDisplayStatus(followUpDate),
  };
}

export function matchesPendientesSearch(row: PendientesListRow, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    row.customer_name.toLowerCase().includes(q) ||
    row.phone.toLowerCase().includes(q) ||
    (row.note ?? "").toLowerCase().includes(q)
  );
}

export function matchesPendientesDateRange(
  followUpDate: string,
  range: AdminPendientesDateRange,
): boolean {
  if (range === "all") return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${followUpDate.slice(0, 10)}T00:00:00`);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (range === "today") return diffDays === 0;
  if (range === "next7") return diffDays >= 0 && diffDays <= 7;
  if (range === "next30") return diffDays >= 0 && diffDays <= 30;
  return true;
}

export function buildPendientesSummary(rows: AdminPendienteRow[]): AdminPendientesSummary {
  const bySlug = new Map<string, { slug: string; name: string; count: number }>();
  for (const row of rows) {
    const existing = bySlug.get(row.tipificationSlug);
    if (existing) {
      existing.count += 1;
    } else {
      bySlug.set(row.tipificationSlug, {
        slug: row.tipificationSlug,
        name: row.tipificationName,
        count: 1,
      });
    }
  }

  let deuda = 0;
  let permanencia = 0;
  let seguimiento = 0;
  for (const row of rows) {
    if ((PENDIENTES_SUMMARY_GROUPS.deuda as readonly string[]).includes(row.tipificationSlug)) {
      deuda += 1;
    } else if (
      (PENDIENTES_SUMMARY_GROUPS.permanencia as readonly string[]).includes(row.tipificationSlug)
    ) {
      permanencia += 1;
    } else if (
      (PENDIENTES_SUMMARY_GROUPS.seguimiento as readonly string[]).includes(row.tipificationSlug)
    ) {
      seguimiento += 1;
    }
  }

  return {
    totalPending: rows.length,
    deuda,
    permanencia,
    seguimiento,
    byType: [...bySlug.values()].sort((a, b) => b.count - a.count),
  };
}

export type { AdminPendienteDisplayStatus };
