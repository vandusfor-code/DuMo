"use client";

import { Coins, Monitor, Package, CircleDot } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EquipmentCatalogItem } from "@/types/equipment";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function MetricCard({
  icon,
  iconClass,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  subtext: string;
}) {
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
          <p className="mt-0.5 text-[26px] font-bold leading-none tracking-tight text-ink">{value}</p>
          <p className="mt-2 text-[12px] text-muted">{subtext}</p>
        </div>
      </div>
    </Card>
  );
}

export function EquipmentMetrics({ items }: { items: EquipmentCatalogItem[] }) {
  const total = items.length;
  const active = items.filter((i) => i.status === "active").length;
  const inactive = total - active;
  const inventoryValue = items.reduce((sum, i) => sum + (Number(i.totalValue) || 0), 0);

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        icon={<Package />}
        iconClass="bg-brand-soft text-brand"
        label="Total de equipos"
        value={String(total)}
        subtext="Todos los registros"
      />
      <MetricCard
        icon={<Monitor />}
        iconClass="bg-success-soft text-success-ink"
        label="Activos"
        value={String(active)}
        subtext={`${pct(active, total)}% del total`}
      />
      <MetricCard
        icon={<CircleDot />}
        iconClass="bg-canvas text-muted"
        label="Inactivos"
        value={String(inactive)}
        subtext={`${pct(inactive, total)}% del total`}
      />
      <MetricCard
        icon={<Coins />}
        iconClass="bg-warning-soft text-warning-ink"
        label="Valor total del inventario"
        value={money.format(inventoryValue)}
        subtext="Valor de todos los equipos"
      />
    </div>
  );
}
