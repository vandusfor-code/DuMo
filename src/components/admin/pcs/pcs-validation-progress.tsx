"use client";

export function PcsValidationProgress({ procesados, total }: { procesados: number; total: number }) {
  const pct = total > 0 ? Math.round((procesados / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>Validando...</span>
        <span className="font-medium text-ink">
          {procesados} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
