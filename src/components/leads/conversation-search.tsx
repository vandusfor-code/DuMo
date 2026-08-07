"use client";

import { Search } from "lucide-react";

export function ConversationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre..."
        className="h-11 w-full rounded-input border border-border-strong bg-card pl-11 pr-4 text-[14px] text-ink outline-none transition-all duration-150 placeholder:text-placeholder focus:border-brand focus:shadow-[0_0_0_4px_rgba(124,58,237,0.08)]"
      />
    </div>
  );
}
