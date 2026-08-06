"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SaleLine } from "./sale-line";
import { SaleContractSummary } from "./sale-contract-summary";
import { usePlans } from "@/hooks/use-leads";
import { EMPTY_LEAD_LINE, type LeadFormValues } from "@/types/lead-form";
import { PLANS_MOCK } from "@/data/mock/leads.mock";

/** Detalles de la venta — solo visible cuando Tipo de gestión = Venta. */
export function SaleDetails() {
  const { control } = useFormContext<LeadFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const { data: plans } = usePlans();
  const planList = plans ?? PLANS_MOCK;

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <h3 className="text-[15px] font-semibold text-ink">Líneas vendidas</h3>
      <p className="mt-0.5 text-[13px] text-muted">
        Agrega una o varias líneas asociadas a esta venta.
      </p>

      <div className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {fields.map((field, index) => (
            <SaleLine
              key={field.id}
              index={index}
              plans={planList}
              canRemove={fields.length > 1}
              onRemove={() => remove(index)}
            />
          ))}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => append({ ...EMPTY_LEAD_LINE })}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 py-3 text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft"
      >
        <Plus className="size-[18px]" />
        Agregar otra línea
      </button>

      <SaleContractSummary />
    </div>
  );
}
