import { Trophy } from "lucide-react";

/** Purple encouragement card with the monthly-goal progress bar. */
export function MonthlyProgressCard({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="rounded-card bg-gradient-to-br from-[#f3effe] to-[#ece5fd] p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_rgba(109,40,217,0.3)]">
          <Trophy className="size-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold text-ink">¡Vas muy bien!</p>
          <p className="text-[13px] text-muted">
            Llevas un {clamped}% de tu meta mensual.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div
          className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-[var(--ease-out-soft)]"
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span className="text-[14px] font-bold text-brand">{clamped}%</span>
      </div>
    </div>
  );
}
