"use client";

import { cn } from "@/lib/utils";

export function TipificationBadge({
  name,
  badgeBg,
  badgeText,
  className,
}: {
  name: string;
  badgeBg: string;
  badgeText: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium leading-none",
        className,
      )}
      style={{ backgroundColor: badgeBg, color: badgeText }}
    >
      {name}
    </span>
  );
}
