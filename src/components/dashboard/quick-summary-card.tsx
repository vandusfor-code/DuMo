import {
  ClipboardList,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { DashboardData } from "@/types/dashboard";

type Row = { icon: LucideIcon; label: string; value: number };

/** "Resumen rápido" — four minimalist metric rows. */
export function QuickSummaryCard({
  summary,
}: {
  summary: DashboardData["quickSummary"];
}) {
  const rows: Row[] = [
    { icon: TrendingUp, label: "Ventas del día", value: summary.dailySales },
    { icon: TrendingUp, label: "Ventas del mes", value: summary.monthlySales },
    { icon: UserPlus, label: "Clientes nuevos", value: summary.newClients },
    {
      icon: ClipboardList,
      label: "Pendientes por gestionar",
      value: summary.pending,
    },
  ];

  return (
    <Card className="p-7">
      <h3 className="text-[17px] font-semibold text-ink">Resumen rápido</h3>
      <ul className="mt-5 space-y-1">
        {rows.map((row, i) => {
          const Icon = row.icon;
          return (
            <li
              key={i}
              className="flex items-center gap-3.5 rounded-xl py-2.5 transition-colors"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <Icon className="size-[19px]" />
              </span>
              <span className="flex-1 text-[14px] text-muted">{row.label}</span>
              <span className="text-[18px] font-bold text-ink">{row.value}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
