"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedSalesScript } from "@/types/sales-script";
import { cn } from "@/lib/utils";

export function SalesScriptTab({ script }: { script: GeneratedSalesScript | null | undefined }) {
  const [stepIndex, setStepIndex] = useState(0);

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-canvas/50 px-6 py-12 text-center">
        <ScrollText className="size-10 text-muted" />
        <p className="mt-3 text-[14px] font-medium text-ink">Script no disponible</p>
        <p className="mt-1 max-w-xs text-[13px] text-muted">
          Guarda una gestión de venta para generar automáticamente el script de la llamada.
        </p>
      </div>
    );
  }

  const steps = script.steps;
  const current = steps[stepIndex];
  const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-canvas/50 p-4">
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-4">
          <InfoItem label="Cliente" value={script.meta.clientName} />
          <InfoItem label="Tipo venta" value={script.meta.saleTypeLabel} />
          <InfoItem label="Plan" value={script.meta.planName} />
          <InfoItem label="Total mensual" value={script.meta.totalMonthlyLabel} highlight />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">
              {script.flowTitle}
            </p>
            <p className="mt-1 text-[13px] text-muted">
              Paso {stepIndex + 1} de {steps.length}
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <h4 className="mt-5 text-[15px] font-semibold text-ink">{current?.title}</h4>
        <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
          {current?.content}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={stepIndex >= steps.length - 1}
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border-b border-line/60 pb-2 last:border-0 sm:border-b-0 sm:pb-0">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-0.5 text-[14px] font-medium", highlight ? "text-brand" : "text-ink")}>
        {value || "—"}
      </p>
    </div>
  );
}
