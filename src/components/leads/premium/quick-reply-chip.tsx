"use client";

import type { PinnedShortcutVisual } from "@/lib/pinned-quick-replies";
import { cn } from "@/lib/utils";

/** Botón de atajo fijado — diseño spec chat premium (icono + etiqueta). */
export function QuickReplyChip({
  label,
  visual,
  onClick,
  disabled,
  compact = false,
}: {
  label: string;
  visual: PinnedShortcutVisual;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { Icon, iconBg, iconColor } = visual;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white text-left transition-colors duration-200",
        "hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-10 max-w-[148px] px-2.5 py-1.5" : "min-h-[52px] min-w-0 flex-1 rounded-lg px-2 py-2",
      )}
    >
      <span
        className={cn(
          "grid shrink-0 place-items-center rounded-full",
          compact ? "size-7" : "size-8",
          iconBg,
        )}
      >
        <Icon className={cn(compact ? "size-3.5" : "size-4", iconColor)} strokeWidth={2} />
      </span>
      <span
        className={cn(
          "font-medium leading-snug text-ink",
          compact
            ? "truncate text-[11px] sm:text-[12px]"
            : "line-clamp-2 text-[11px] sm:text-[12px]",
        )}
      >
        {label}
      </span>
    </button>
  );
}
