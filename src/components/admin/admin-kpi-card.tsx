import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminKpi } from "@/types/admin-dashboard";

export function AdminKpiCard({
  icon,
  iconClass,
  label,
  kpi,
}: {
  icon: React.ReactNode;
  /** Clases de color del icono, ej. "bg-brand-soft text-brand". */
  iconClass: string;
  label: string;
  kpi: AdminKpi;
}) {
  const up = kpi.delta >= 0;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-xl [&_svg]:size-[22px]",
            iconClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] text-muted">{label}</p>
          <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-ink">
            {kpi.value}
          </p>
          <p className="mt-2 flex items-center gap-1 text-[12px]">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                up ? "text-success-ink" : "text-danger-ink",
              )}
            >
              {up ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {Math.abs(kpi.delta)}%
            </span>
            <span className="text-muted">{kpi.deltaLabel}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
