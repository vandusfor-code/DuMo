import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ChartPoint } from "@/types/common";
import { MiniAreaChart } from "./mini-area-chart";

/** Daily/monthly sales card: KPI number, goal, and a trend chart. */
export function SalesTrendCard({
  title,
  dateLabel,
  count,
  goal,
  series,
  yTicks,
  gradientId,
}: {
  title: string;
  dateLabel: string;
  count: number;
  goal: number;
  series: ChartPoint[];
  yTicks: number[];
  gradientId: string;
}) {
  return (
    <Card className="flex flex-col p-7">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
          <Calendar className="size-4" />
          {dateLabel}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[40px] font-bold leading-none tracking-tight text-brand">
          {count}
        </p>
        <p className="mt-2 text-[13px] text-muted">Objetivo: {goal} ventas</p>
      </div>

      <div className="mt-3">
        <MiniAreaChart data={series} yTicks={yTicks} gradientId={gradientId} />
      </div>
    </Card>
  );
}
