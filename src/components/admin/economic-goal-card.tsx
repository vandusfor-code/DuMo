import { DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { EconomicGoal } from "@/types/admin-dashboard";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function EconomicGoalCard({ goal }: { goal: EconomicGoal }) {
  const progress = Math.max(0, Math.min(100, goal.progress));
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 lg:w-72">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-success-soft text-success-ink">
            <DollarSign className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Meta económica (ingreso DuMo)</p>
            <p className="mt-0.5 text-[24px] font-bold leading-none text-ink">
              {money.format(goal.goal)}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-success-ink transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Ingreso DuMo del mes" value={money.format(goal.current)} tone="success" />
          <Stat label="Avance" value={`${goal.progress}%`} tone="brand" />
          <Stat label="Faltan" value={money.format(goal.remaining)} tone="danger" />
        </div>
      </div>
    </Card>
  );
}

const TONES = {
  success: "text-success-ink",
  brand: "text-brand",
  danger: "text-danger-ink",
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
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`text-[18px] font-bold ${TONES[tone]}`}>{value}</p>
    </div>
  );
}
