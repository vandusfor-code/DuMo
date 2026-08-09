"use client";

import { useTipificationCatalog } from "@/hooks/use-tipification-catalog";
import { TipificationBadge } from "@/components/shared/tipification-badge";

export function DynamicTipificationBadge({ slug }: { slug: string }) {
  const { getLabel, getBadge } = useTipificationCatalog();
  const { badgeBg, badgeText } = getBadge(slug);
  return (
    <TipificationBadge name={getLabel(slug)} badgeBg={badgeBg} badgeText={badgeText} />
  );
}
