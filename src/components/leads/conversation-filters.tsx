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
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {CONVERSATION_FILTERS.map((f) => {
        const active = f.value === value;
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-200",
              active ? "bg-brand text-white" : "text-muted hover:bg-brand-soft hover:text-brand",
            )}
          >
            {f.label}
            <span
              className={cn(
                "grid h-4 min-w-4 place-items-center rounded-full px-1 text-[11px] font-semibold",
                active ? "bg-white/25 text-white" : "bg-canvas text-muted",
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
