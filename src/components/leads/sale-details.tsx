"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { SaleLine } from "./sale-line";
import { SaleContractSummary } from "./sale-contract-summary";
import { usePlans } from "@/hooks/use-leads";
import { EMPTY_LEAD_LINE, type LeadFormValues } from "@/types/lead-form";
import { SectionCard, SectionCardBody, SectionCardHeader } from "@/components/leads/premium/section-card";
import { QueryFatalError } from "@/components/shared/query-state";

/** Detalles de la venta — solo visible cuando Tipo de gestión = Venta. */
export function SaleDetails() {
  const { control } = useFormContext<LeadFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const plansQuery = usePlans();
  const plans = plansQuery.data;
  const plansReady = Boolean(plans?.length);

  return (
    <SectionCard>
      <SectionCardHeader title="Líneas vendidas" />
      <SectionCardBody className="space-y-4 pt-0">
      <p className="text-[13px] text-muted">
        Agrega una o varias líneas asociadas a esta venta.
      </p>

      <QueryFatalError
        query={plansQuery}
        title="No se pudo cargar el catálogo comercial de planes. No es posible registrar la venta hasta que la Oferta Comercial esté disponible."
      />

      {plansQuery.isPending && !plans && (
        <p className="mt-4 text-[13px] text-muted">Cargando planes comerciales…</p>
      )}

      {plansReady && (
        <>
          <div className="mt-4 space-y-3">
            <AnimatePresence initial={false}>
              {fields.map((field, index) => (
                <SaleLine
                  key={field.id}
                  index={index}
                  plans={plans!}
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

          <SaleContractSummary plans={plans!} />
        </>
      )}
      </SectionCardBody>
    </SectionCard>
  );
}
