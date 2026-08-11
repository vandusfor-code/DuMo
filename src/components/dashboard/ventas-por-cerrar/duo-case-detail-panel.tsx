"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, PhoneCall, Send } from "lucide-react";
import {
  SectionCard,
  SectionCardBody,
  SectionCardHeader,
} from "@/components/leads/premium/section-card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency } from "@/lib/format";
import {
  CURRENT_OPERATOR_LABELS,
  DELIVERY_TYPE_LABELS,
  LEAD_SALE_TYPE_LABELS,
  type CurrentOperator,
  type DeliveryType,
  type LeadSaleType,
} from "@/types/lead";
import { useAddDuoClosingNote, useCloseDuoSale } from "@/hooks/use-ventas-por-cerrar";
import type { DuoSale } from "@/types/duo-sale";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-1 text-[14px] font-medium text-ink">{value || "—"}</p>
    </div>
  );
}

/**
 * Panel de detalle en la vista de la asesora de cierre. Muestra los datos
 * que capturó la asesora que concretó por chat (solo lectura), deja agregar
 * notas de contacto, y — DUO-4 — cerrar el caso como venta real: crea la
 * fila en `sales` a nombre de la asesora de origen (con la mitad de la
 * comisión del plan) y la entrada de comisión de la asesora de cierre.
 * Pide confirmación explícita porque es irreversible y mueve dinero real.
 */
export function DuoCaseDetailPanel({ sale }: { sale: DuoSale }) {
  const [note, setNote] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const addNote = useAddDuoClosingNote();
  const closeSale = useCloseDuoSale();

  const handleSubmit = async () => {
    const text = note.trim();
    if (!text) return;
    await addNote.mutateAsync({ id: sale.id, text });
    setNote("");
  };

  const missingRequiredFields = !sale.plan.trim() || !sale.saleType || !sale.region || !sale.comuna;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <SectionCard className="rounded-none border-x-0 border-t-0 shadow-none">
        <SectionCardHeader
          title="Datos capturados por la asesora"
          subtitle={`Concretó: ${sale.originAdvisorName}`}
        />
        <SectionCardBody className="grid grid-cols-2 gap-4 pt-0">
          <Field label="Cliente" value={sale.customerName} />
          <Field label="RUT" value={sale.rut} />
          <Field label="Teléfono" value={sale.phone} />
          <Field label="Correo" value={sale.email} />
          <Field
            label="Operador actual"
            value={
              sale.currentCompany
                ? CURRENT_OPERATOR_LABELS[sale.currentCompany as CurrentOperator]
                : ""
            }
          />
          <Field label="Plan" value={sale.plan} />
          <Field label="Equipo" value={sale.equipment} />
          <Field
            label="Tipo de venta"
            value={sale.saleType ? LEAD_SALE_TYPE_LABELS[sale.saleType as LeadSaleType] : ""}
          />
          <Field
            label="Tipo de entrega"
            value={sale.dispatch ? DELIVERY_TYPE_LABELS[sale.dispatch as DeliveryType] : ""}
          />
          <Field label="Región" value={sale.region} />
          <Field label="Comuna" value={sale.comuna} />
          <Field label="Dirección" value={`${sale.street} ${sale.houseNumber}`.trim()} />
          <Field label="Nombre registrado en DuMo" value={sale.dumoRegisteredName} />
          <Field label="Horario preferido de llamada" value={sale.callTime} />
          <div className="col-span-2">
            <Field label="Comentarios" value={sale.comments} />
          </div>
        </SectionCardBody>
      </SectionCard>

      <SectionCard className="rounded-none border-x-0 border-t-0 shadow-none">
        <SectionCardHeader title="Cierre" />
        <SectionCardBody className="space-y-3 pt-0">
          {closeSale.isError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {closeSale.error instanceof Error
                ? closeSale.error.message
                : "No se pudo cerrar el caso."}
            </div>
          )}

          {closeSale.data ? (
            <div className="rounded-lg bg-success-soft p-3 text-[13px] text-success-ink">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" /> Venta {closeSale.data.saleId} creada
              </p>
              <p className="mt-1">
                Tu comisión: {formatCurrency(closeSale.data.closingCommission)} · Comisión de{" "}
                {sale.originAdvisorName}: {formatCurrency(closeSale.data.originCommission)}
              </p>
            </div>
          ) : sale.status === "closed" ? (
            <div className="rounded-lg bg-canvas p-3 text-[13px] text-muted">
              Este caso ya fue cerrado{sale.closedSaleId ? ` (venta ${sale.closedSaleId})` : ""}.
            </div>
          ) : (
            <>
              {missingRequiredFields && (
                <p className="text-[12px] text-warning-ink">
                  Faltan datos del formulario original (plan, tipo de venta, región o comuna) —
                  pídeselos a {sale.originAdvisorName} antes de cerrar.
                </p>
              )}
              <Button
                type="button"
                onClick={() => setConfirmClose(true)}
                disabled={missingRequiredFields || closeSale.isPending}
                className="w-full"
              >
                {closeSale.isPending ? (
                  <Loader2 className="size-[18px] animate-spin" />
                ) : (
                  <PhoneCall className="size-[16px]" />
                )}
                Cerrar como venta
              </Button>
            </>
          )}
        </SectionCardBody>
      </SectionCard>

      <SectionCard className="rounded-none border-x-0 border-t-0 shadow-none flex-1">
        <SectionCardHeader title="Notas de contacto" />
        <SectionCardBody className="space-y-3 pt-0">
          {addNote.isError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {addNote.error instanceof Error
                ? addNote.error.message
                : "No se pudo guardar la nota."}
            </div>
          )}

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Ej. "No contesta, reintento en la tarde"'
            className="h-[90px] text-[14px]"
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!note.trim() || addNote.isPending}
            className="w-full"
          >
            {addNote.isPending ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Send className="size-[16px]" />
            )}
            Guardar nota
          </Button>

          {sale.closingNotes.length > 0 && (
            <ol className="space-y-3 border-t border-line pt-3">
              {sale.closingNotes.map((n) => (
                <li key={n.id} className="rounded-lg bg-canvas p-3">
                  <p className="text-[13px] text-ink">{n.text}</p>
                  <p className="mt-1 text-[11px] text-muted">
                    {n.author} · {new Date(n.createdAt).toLocaleString("es-CL")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </SectionCardBody>
      </SectionCard>

      <ConfirmDialog
        open={confirmClose}
        title="Cerrar como venta"
        description={`Se creará una venta real a nombre de ${sale.originAdvisorName} y quedará registrada tu comisión por el cierre. Esta acción no se puede deshacer.`}
        confirmLabel="Confirmar cierre"
        isLoading={closeSale.isPending}
        onCancel={() => setConfirmClose(false)}
        onConfirm={async () => {
          await closeSale.mutateAsync(sale.id);
          setConfirmClose(false);
        }}
      />
    </div>
  );
}
