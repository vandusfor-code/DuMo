import { DEFAULT_TIPIFICATION_SEEDS, P16_TIPIFICATION_PLAN } from "@/lib/tipification-seeds";
import { LEAD_TYPE_LABELS, type LeadType } from "@/types/lead";
import { TIPIFICATION_BADGE_COLORS, type Tipification } from "@/types/tipification";

/** Respaldo si la API de tipificaciones no responde — equivalente al enum histórico. */
export function fallbackTriggersSaleFlow(slug: string): boolean {
  return slug === "venta";
}

export function buildFallbackTipificationCatalog(companyId = "company-default"): Tipification[] {
  const now = new Date().toISOString();
  const badge = TIPIFICATION_BADGE_COLORS.in_progress;
  const legacy = DEFAULT_TIPIFICATION_SEEDS.map((seed) => ({
    ...seed,
    companyId,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
  }));
  const p16Inserts = P16_TIPIFICATION_PLAN.inserts.map((insert) => ({
    ...insert,
    ...badge,
    companyId,
    triggersSaleFlow: false,
    status: "active" as const,
    createdAt: now,
    updatedAt: now,
    createdBy: "system",
  }));
  return [...legacy, ...p16Inserts].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function triggersSaleFlowFromCatalog(
  slug: string,
  catalog: Pick<Tipification, "slug" | "triggersSaleFlow">[],
): boolean {
  const match = catalog.find((item) => item.slug === slug);
  if (match) return match.triggersSaleFlow;
  return fallbackTriggersSaleFlow(slug);
}

export function getTipificationLabelFromCatalog(
  slug: string,
  catalog: Pick<Tipification, "slug" | "name">[],
): string {
  const match = catalog.find((item) => item.slug === slug);
  if (match) return match.name;
  const legacy = LEAD_TYPE_LABELS[slug as LeadType];
  return legacy ?? slug;
}

export function getTipificationBadgeFromCatalog(
  slug: string,
  catalog: Pick<Tipification, "slug" | "badgeBg" | "badgeText">[],
): { badgeBg: string; badgeText: string } {
  const match = catalog.find((item) => item.slug === slug);
  if (match) return { badgeBg: match.badgeBg, badgeText: match.badgeText };
  if (fallbackTriggersSaleFlow(slug)) {
    return { badgeBg: "#ECFDF3", badgeText: "#027A48" };
  }
  return { badgeBg: "#EEF4FF", badgeText: "#3538CD" };
}

/** Opciones de select ordenadas para UI (activas). */
export function tipificationSelectOptions(
  catalog: Pick<Tipification, "slug" | "name" | "sortOrder" | "status">[],
) {
  return [...catalog]
    .filter((item) => item.status !== "inactive")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
    .map((item) => ({ value: item.slug, label: item.name }));
}
