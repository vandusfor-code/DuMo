"use client";

import { cn } from "@/lib/utils";
import type { AdminLeadFilter, AdminLeadStatus } from "@/types/admin-lead";
import { ADMIN_LEAD_STATUS_LABELS } from "@/types/admin-lead";

export const ADMIN_CONVERSATION_FILTERS: { value: AdminLeadFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "nuevo", label: "Nuevo" },
  { value: "asignado", label: "Asignado" },
  { value: "contactado", label: "Contactado" },
  { value: "negociacion", label: "En negociación" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

export function AdminConversationFilters({
  value,
  onChange,
  counts,
}: {
  value: AdminLeadFilter;
  onChange: (v: AdminLeadFilter) => void;
  counts: Record<AdminLeadFilter, number>;
}) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {ADMIN_CONVERSATION_FILTERS.map((f) => {
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

export function AdminLeadStatusBadge({ status }: { status: AdminLeadStatus }) {
  const colors: Record<AdminLeadStatus, string> = {
    nuevo: "bg-brand-soft text-brand",
    asignado: "bg-[#e8f0fe] text-[#2563eb]",
    contactado: "bg-warning-soft text-warning-ink",
    negociacion: "bg-[#fef3c7] text-[#b45309]",
    convertido: "bg-success-soft text-success-ink",
    perdido: "bg-danger-soft text-danger-ink",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", colors[status])}>
      {ADMIN_LEAD_STATUS_LABELS[status]}
    </span>
  );
}
