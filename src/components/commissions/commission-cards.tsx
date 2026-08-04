import { Clock, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export interface CommissionTotals {
  generated: number;
  paid: number;
  pending: number;
  salesCount: number;
}

/** Four KPI cards: generada / pagada / pendiente / ventas asociadas. */
export function CommissionCards({ totals }: { totals: CommissionTotals }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi
        icon={<DollarSign className="size-6" />}
        tint="brand"
        title="Comisión generada"
        value={formatCurrency(totals.generated)}
        caption="Total del mes"
      />
      <Kpi
        icon={<Wallet className="size-6" />}
        tint="success"
        title="Comisión pagada"
        value={formatCurrency(totals.paid)}
        caption="Pagado"
      />
      <Kpi
        icon={<Clock className="size-6" />}
        tint="warning"
        title="Comisión pendiente"
        value={formatCurrency(totals.pending)}
        caption="Pendiente de pago"
      />
      <Kpi
        icon={<TrendingUp className="size-6" />}
        tint="neutral"
        title="Ventas asociadas"
        value={String(totals.salesCount)}
        caption="Total de ventas"
      />
    </div>
  );
}

const TINTS = {
  brand: "bg-brand-soft text-brand",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  neutral: "bg-canvas text-muted",
} as const;

const VALUE_COLORS = {
  brand: "text-brand",
  success: "text-success-ink",
  warning: "text-warning-ink",
  neutral: "text-ink",
} as const;

function Kpi({
  icon,
  tint,
  title,
  value,
  caption,
}: {
  icon: React.ReactNode;
  tint: keyof typeof TINTS;
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <Card className="p-7">
      <span className={`grid size-12 place-items-center rounded-2xl ${TINTS[tint]}`}>
        {icon}
      </span>
      <p className="mt-5 text-[14px] text-muted">{title}</p>
      <p className={`mt-1 text-[26px] font-bold leading-tight ${VALUE_COLORS[tint]}`}>
        {value}
      </p>
      <p className="mt-1 text-[13px] text-muted">{caption}</p>
    </Card>
  );
}
