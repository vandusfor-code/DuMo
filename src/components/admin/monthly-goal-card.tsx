import { Pencil, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { MonthlyGoal } from "@/types/admin-dashboard";

export function MonthlyGoalCard({ goal }: { goal: MonthlyGoal }) {
  const progress = Math.max(0, Math.min(100, goal.progress));
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4 lg:w-80">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Target className="size-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-muted">Meta mensual de ventas</p>
            <div className="mt-0.5 flex items-center gap-2">
              <p className="text-[24px] font-bold leading-none text-ink">
                {goal.goal}{" "}
                <span className="text-[15px] font-semibold text-muted">ventas</span>
              </p>
              <button
                type="button"
                aria-label="Editar meta"
                className="text-muted transition-colors hover:text-brand"
              >
                <Pencil className="size-4" />
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Ventas del mes" value={`${goal.current}`} tone="success" />
          <Stat label="Avance" value={`${goal.progress}%`} tone="brand" />
          <Stat label="Faltan para la meta" value={`${goal.remaining}`} hint="ventas" tone="danger" />
          <Stat label="Objetivo" value={`${goal.salesNeeded}`} hint="por cerrar" tone="ink" />
        </div>
      </div>
    </Card>
  );
}

const TONES = {
  success: "text-success-ink",
  brand: "text-brand",
  danger: "text-danger-ink",
  ink: "text-ink",
} as const;

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={`text-[18px] font-bold ${TONES[tone]}`}>
        {value}
        {hint && <span className="ml-1 text-[12px] font-normal text-muted">{hint}</span>}
      </p>
    </div>
  );
}
