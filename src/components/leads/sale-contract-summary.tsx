"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { usePlans } from "@/hooks/use-leads";
import { computeContractSummary } from "@/lib/lead-contract-summary";
import { PLANS_MOCK } from "@/data/mock/leads.mock";
import type { LeadFormValues } from "@/types/lead-form";

/** Resumen automático de la contratación — debajo de Líneas vendidas. */
export function SaleContractSummary() {
  const { control } = useFormContext<LeadFormValues>();
  const lines = useWatch({ control, name: "lines" }) ?? [];
  const { data: plans } = usePlans();
  const planList = plans ?? PLANS_MOCK;
  const summary = computeContractSummary(lines, planList);

  return (
    <div className="mt-4 rounded-2xl border border-line bg-canvas/50 p-4">
      <h4 className="text-[14px] font-semibold text-ink">Resumen de la contratación</h4>

      <dl className="mt-3 space-y-2.5 text-[14px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Línea principal</dt>
          <dd className="text-right font-medium text-ink">
            {summary.mainPlanName !== "—" ? (
              <>
                <span>{summary.mainPlanName}</span>
                <span className="ml-2 text-brand">{summary.mainPlanValueLabel}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted">Líneas adicionales</dt>
          <dd className="text-right font-medium text-ink">
            {summary.additionalCount > 0 ? (
              <>
                <span>{summary.additionalCount}</span>
                <span className="ml-2 text-muted">{summary.additionalLabel}</span>
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-2.5">
          <dt className="font-semibold text-ink">Total mensual</dt>
          <dd className="text-[15px] font-bold text-brand">{summary.totalMonthlyLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
