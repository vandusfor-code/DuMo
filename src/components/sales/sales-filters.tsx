"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type SalesRange = "today" | "week" | "month" | "all";

export const SALES_RANGE_OPTIONS = [
  { label: "Hoy", value: "today" as const },
  { label: "Esta semana", value: "week" as const },
  { label: "Este mes", value: "month" as const },
  { label: "Todas", value: "all" as const },
];

export function SalesFilters({
  range,
  onRangeChange,
}: {
  range: SalesRange;
  onRangeChange: (range: SalesRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        options={SALES_RANGE_OPTIONS}
        value={range}
        onChange={onRangeChange}
      />
      <Button variant="secondary" size="default">
        <SlidersHorizontal className="size-[18px]" />
        Filtros
      </Button>
    </div>
  );
}
