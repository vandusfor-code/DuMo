"use client";

import { cn } from "@/lib/utils";

export function QuickReplyChip({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full border border-line bg-card px-4",
        "text-[13px] font-medium text-ink transition-all duration-200",
        "hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {label}
    </button>
  );
}
