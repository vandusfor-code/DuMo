import "server-only";

/** Etiqueta de tipificación mostrada en listas de conversación (última gestión guardada). */
export type ConversationTipification = {
  slug: string;
  name: string;
  badgeBg: string;
  badgeText: string;
};

export type TipificationJoinRow = {
  latest_tipification_slug?: string | null;
  latest_tipification_name?: string | null;
  badge_bg?: string | null;
  badge_text?: string | null;
};

const DEFAULT_BADGE_BG = "#ede9fe";
const DEFAULT_BADGE_TEXT = "#6d28d9";

export function mapConversationTipification(
  row: TipificationJoinRow,
): ConversationTipification | null {
  const slug = row.latest_tipification_slug?.trim();
  if (!slug) return null;
  return {
    slug,
    name: row.latest_tipification_name?.trim() || slug,
    badgeBg: row.badge_bg?.trim() || DEFAULT_BADGE_BG,
    badgeText: row.badge_text?.trim() || DEFAULT_BADGE_TEXT,
  };
}
