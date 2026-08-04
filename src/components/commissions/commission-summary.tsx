import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { CommissionTotals } from "./commission-cards";

/** Bottom summary card for the selected month. */
export function CommissionSummary({
  monthLabel,
  totals,
  nextPaymentLabel,
}: {
  monthLabel: string;
  totals: CommissionTotals;
  nextPaymentLabel: string;
}) {
  return (
    <div className="rounded-card bg-gradient-to-br from-[#f3effe] to-[#ece5fd] p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3.5 lg:w-60">
          <span className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_rgba(109,40,217,0.3)]">
            <DollarSign className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="text-[16px] font-semibold text-brand">Resumen del mes</p>
            <p className="text-[13px] text-muted">{monthLabel}</p>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Comisión generada" value={formatCurrency(totals.generated)} tone="brand" />
          <Stat label="Comisión pagada" value={formatCurrency(totals.paid)} tone="success" />
          <Stat label="Comisión pendiente" value={formatCurrency(totals.pending)} tone="warning" />
          <Stat label="Próximo pago estimado" value={nextPaymentLabel} tone="ink" />
        </div>
      </div>
    </div>
  );
}

const TONES = {
  brand: "text-brand",
  success: "text-success-ink",
  warning: "text-warning-ink",
  ink: "text-ink",
} as const;

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={`text-[16px] font-bold ${TONES[tone]}`}>{value}</p>
    </div>
  );
}
