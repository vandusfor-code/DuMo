import { Trophy } from "lucide-react";

/** Purple encouragement card with the monthly-goal progress bar. */
export function MonthlyProgressCard({
  progress,
  economicProgress,
  current,
  goal,
}: {
  progress: number;
  economicProgress?: number;
  current?: number;
  goal?: number;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const economicClamped =
    economicProgress !== undefined
      ? Math.max(0, Math.min(100, economicProgress))
      : undefined;

  const progressText =
    goal !== undefined && goal > 0
      ? `Llevas ${current ?? 0} de ${goal} ventas (${clamped}% de tu meta).`
      : `Llevas un ${clamped}% de tu meta de ventas.`;

  return (
    <div className="rounded-card bg-gradient-to-br from-[#f3effe] to-[#ece5fd] p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_rgba(109,40,217,0.3)]">
          <Trophy className="size-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">¡Vas muy bien!</p>
          <p className="text-[13px] text-muted">
            {progressText}
            {economicClamped !== undefined
              ? ` Ingreso DuMo al ${economicClamped}%.`
              : null}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <ProgressRow label="Ventas" value={clamped} />
        {economicClamped !== undefined ? (
          <ProgressRow label="Meta económica" value={economicClamped} tone="success" />
        ) : null}
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  tone = "brand",
}: {
  label: string;
  value: number;
  tone?: "brand" | "success";
}) {
  const barClass = tone === "success" ? "bg-success-ink" : "bg-brand";
  const textClass = tone === "success" ? "text-success-ink" : "text-brand";
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-muted">{label}</p>
      <div className="flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70"
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out-soft)] ${barClass}`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className={`text-[14px] font-bold ${textClass}`}>{value}%</span>
      </div>
    </div>
  );
}
