import {
  Ban,
  ClipboardList,
  FileText,
  Truck,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminSalesSummary } from "@/types/admin-sale";

function pct(n: number, total: number): string {
  if (!total) return "0% del total";
  return `${((n / total) * 100).toFixed(1)}% del total`;
}

export function AdminSalesKpis({ summary }: { summary: AdminSalesSummary }) {
  const t = summary.total;
  const cards = [
    { icon: <FileText />, tint: "bg-brand-soft text-brand", label: "Total ventas", value: t, sub: "Todas las ventas" },
    { icon: <ClipboardList />, tint: "bg-success-soft text-success-ink", label: "Registradas", value: summary.registrada, sub: pct(summary.registrada, t) },
    { icon: <Truck />, tint: "bg-warning-soft text-warning-ink", label: "En reparto", value: summary.en_reparto, sub: pct(summary.en_reparto, t) },
    { icon: <CheckCircle2 />, tint: "bg-[#e8f0fe] text-[#2563eb]", label: "Finalizadas", value: summary.finalizada, sub: pct(summary.finalizada, t) },
    { icon: <XCircle />, tint: "bg-danger-soft text-danger-ink", label: "Rechazadas", value: summary.rechazada, sub: pct(summary.rechazada, t) },
    { icon: <Ban />, tint: "bg-[#f1f1f6] text-[#6b7280]", label: "Canceladas", value: summary.cancelada, sub: pct(summary.cancelada, t) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <span className={cn("grid size-10 place-items-center rounded-xl [&_svg]:size-5", c.tint)}>
            {c.icon}
          </span>
          <p className="mt-3 text-[12px] text-muted">{c.label}</p>
          <p className="text-[24px] font-bold leading-tight text-ink">{c.value}</p>
          <p className="text-[12px] text-muted">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}
