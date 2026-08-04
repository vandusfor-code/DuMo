import { FileText, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Two KPI cards: total sales and total lines for the current filter. */
export function SalesSummary({
  totalSales,
  totalLines,
}: {
  totalSales: number;
  totalLines: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Kpi
        icon={<FileText className="size-6" />}
        value={totalSales}
        title="Ventas del día"
        caption="Total ventas"
      />
      <Kpi
        icon={<Layers className="size-6" />}
        value={totalLines}
        title="Líneas vendidas"
        caption="Total líneas"
      />
    </div>
  );
}

function Kpi({
  icon,
  value,
  title,
  caption,
}: {
  icon: React.ReactNode;
  value: number;
  title: string;
  caption: string;
}) {
  return (
    <Card className="flex items-center gap-5 p-7">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
        {icon}
      </span>
      <div>
        <p className="text-[14px] text-muted">{title}</p>
        <p className="text-[32px] font-bold leading-tight text-ink">{value}</p>
        <p className="text-[13px] text-muted">{caption}</p>
      </div>
    </Card>
  );
}
