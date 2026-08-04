"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

/** Pill-style segmented control (e.g. Hoy / Esta semana / Este mes / Todas). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-[14px] border border-line bg-card p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[11px] px-4 py-2 text-[14px] font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
              active
                ? "bg-brand-soft text-brand"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
