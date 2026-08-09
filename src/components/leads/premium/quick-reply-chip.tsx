"use client";

import type { PinnedShortcutVisual } from "@/lib/pinned-quick-replies";
import { cn } from "@/lib/utils";

/** Botón de atajo fijado — diseño spec chat premium (icono + etiqueta). */
export function QuickReplyChip({
  label,
  visual,
  onClick,
  disabled,
}: {
  label: string;
  visual: PinnedShortcutVisual;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { Icon, iconBg, iconColor } = visual;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[52px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-[#E8E8E8] bg-white px-2 py-2",
        "text-left transition-colors duration-200",
        "hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          iconBg,
        )}
      >
        <Icon className={cn("size-4", iconColor)} strokeWidth={2} />
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-snug text-ink sm:text-[12px]">
        {label}
      </span>
    </button>
  );
}
