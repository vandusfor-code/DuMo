"use client";

import { useRouter } from "next/navigation";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { Plus, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { CustomerForm } from "@/components/forms/customer-form";
import { SaleLineCard } from "@/components/forms/sale-line-card";
import { NotesField } from "@/components/forms/notes-field";
import { FooterActions } from "@/components/forms/footer-actions";
import { AutoDateCard } from "@/components/forms/auto-date-card";
import { useCreateSale } from "@/hooks/use-sales";
import { newSaleSchema, type NewSaleValues } from "@/lib/schemas/new-sale.schema";
import type { SaleType } from "@/types/sale";

const EMPTY_LINE = {
  phoneNumber: "",
  saleType: "" as SaleType,
  deviceName: "",
};

export default function NuevaVentaPage() {
  const router = useRouter();
  const createSale = useCreateSale();

  const methods = useForm<NewSaleValues>({
    resolver: zodResolver(newSaleSchema),
    defaultValues: {
      customerName: "",
      rut: "",
      phone: "",
      email: "",
      notes: "",
      lines: [{ ...EMPTY_LINE }],
    },
    mode: "onBlur",
  });

  const { fields, append, remove } = useFieldArray({
    control: methods.control,
    name: "lines",
  });

  const onSubmit = async (values: NewSaleValues) => {
    const created = await createSale.mutateAsync({
      customerName: values.customerName,
      rut: values.rut,
      phone: values.phone,
      email: values.email || undefined,
      notes: values.notes || undefined,
      lines: values.lines.map((l) => ({
        phoneNumber: l.phoneNumber,
        saleType: l.saleType,
        deviceName: l.deviceName || undefined,
      })),
    });
    router.push(`/dashboard/mis-ventas/${created.id}`);
  };

  return (
    <div className="space-y-6 pt-1">
      <PageHeader
        title="Nueva Venta"
        subtitle="Registra los datos de la venta y las líneas asociadas."
        actions={<AutoDateCard />}
      />

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <CustomerForm />

          <Card className="p-8">
            <h2 className="text-[18px] font-semibold text-brand">Líneas vendidas</h2>
            <p className="mt-1 text-[14px] text-muted">
              Agrega una o varias líneas asociadas a esta venta.
            </p>

            <div className="mt-6 space-y-4">
              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <SaleLineCard
                    key={field.id}
                    index={index}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(index)}
                  />
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={() => append({ ...EMPTY_LINE })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 py-4 text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft"
            >
              <Plus className="size-[18px]" />
              Agregar otra línea
            </button>

            <div className="my-7 h-px bg-line" />

            <NotesField />
          </Card>

          {createSale.isError && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-[14px] text-danger-ink">
              <AlertCircle className="size-[18px]" />
              No se pudo registrar la venta. Revisa la conexión e intenta nuevamente.
            </div>
          )}

          <FooterActions isSubmitting={createSale.isPending} />
        </form>
      </FormProvider>
    </div>
  );
}
