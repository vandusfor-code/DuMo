"use client";

import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Builds the last `count` months as { value: "yyyy-mm", label: "Agosto 2026" }. */
export function buildMonthOptions(count = 12): { value: string; label: string }[] {
  const monthFmt = new Intl.DateTimeFormat("es-CL", { month: "long" });
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthName = monthFmt.format(d);
    const label = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${d.getFullYear()}`;
    return { value, label };
  });
}

export function CommissionMonthFilter({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const options = buildMonthOptions();

  return (
    <div className="w-[200px]">
      <Select value={month} onValueChange={onMonthChange}>
        <SelectTrigger className="h-12">
          <span className="flex items-center gap-2">
            <Calendar className="size-[18px] text-brand" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
