"use client";

import type { ConversationTipification } from "@/types/conversation";

export function ConversationTipificationBadge({
  tipification,
  className,
}: {
  tipification: ConversationTipification;
  className?: string;
}) {
  return (
    <span
      className={className ?? "inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight"}
      style={{ backgroundColor: tipification.badgeBg, color: tipification.badgeText }}
      title={tipification.name}
    >
      {tipification.name}
    </span>
  );
}
