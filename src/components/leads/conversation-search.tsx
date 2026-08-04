"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ConversationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar por nombre, teléfono o mensaje..."
        className="h-11 pl-11 text-[14px]"
      />
    </div>
  );
}
