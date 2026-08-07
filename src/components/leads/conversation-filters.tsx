"use client";

import { cn } from "@/lib/utils";

export type ConversationFilter = "all" | "new" | "in_progress" | "converted" | "lost";

export const CONVERSATION_FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "new", label: "Nuevos" },
  { value: "in_progress", label: "En gestión" },
  { value: "converted", label: "Convertidos" },
  { value: "lost", label: "Perdidos" },
];

export function ConversationFilters({
  value,
  onChange,
  counts,
}: {
  value: ConversationFilter;
  onChange: (v: ConversationFilter) => void;
  counts: Record<ConversationFilter, number>;
}) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
      {CONVERSATION_FILTERS.map((f) => {
        const active = f.value === value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5",
              "text-[13px] font-medium transition-all duration-200",
              active
                ? "border-border-strong bg-active-surface text-ink"
                : "border-line bg-card text-muted hover:bg-hover hover:text-ink",
            )}
          >
            {f.label}
            <span
              className={cn(
                "text-[12px] font-semibold",
                active ? "text-muted" : "text-placeholder",
              )}
            >
              ({counts[f.value]})
            </span>
          </button>
        );
      })}
    </div>
  );
}
