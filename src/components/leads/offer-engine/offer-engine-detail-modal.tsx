"use client";

import { Loader2, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  OFFER_SALE_TYPE_LABELS,
  type OfferSimulationRecord,
} from "@/types/offer-engine";

export function OfferEngineDetailModal({
  open,
  record,
  isLoading,
  onClose,
}: {
  open: boolean;
  record: OfferSimulationRecord | null;
  isLoading: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-[17px] font-semibold text-ink">Detalle de simulación</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {isLoading || !record ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted">
              <Loader2 className="size-5 animate-spin" />
              Cargando...
            </div>
          ) : (
            <>
              <MetaRow label="Fecha" value={formatDateTime(record.createdAt)} />
              <MetaRow label="Tipo venta" value={OFFER_SALE_TYPE_LABELS[record.saleType]} />
              <MetaRow label="Asesor" value={record.createdByName || record.createdBy} />

              <Section title="Solicitud inicial">
                <DetailRow label="Líneas" value={String(record.requestedLines)} />
                <DetailRow label="Plan principal" value={record.requestedPlan.planName} />
                {record.requestedPlan.additionalPlans.map((p, i) => (
                  <DetailRow key={i} label={`Adicional ${i + 1}`} value={p.planName} />
                ))}
                <DetailRow
                  label="Equipo"
                  value={
                    record.requestedEquipmentDetail?.commercialName ?? "Sin equipo"
                  }
                />
                <DetailRow label="Cupo Línea" value={formatCurrency(record.lineCredit)} />
                <DetailRow label="Cupo Equipo" value={formatCurrency(record.equipmentCredit)} />
                <DetailRow
                  label="Total solicitado"
                  value={formatCurrency(record.requestedMonthlyValue)}
                />
              </Section>

              {record.status === "OPTIMIZED" ? (
                <Section title="Optimización realizada">
                  {record.removedEquipment ? (
                    <DetailRow label="Equipo" value="Eliminado" />
                  ) : null}
                  {record.removedLines > 0 ? (
                    <DetailRow
                      label="Reducción"
                      value={`${record.requestedLines} → ${record.approvedLines} líneas`}
                    />
                  ) : null}
                </Section>
              ) : null}

              <Section title="Resultado final">
                <DetailRow label="Líneas" value={String(record.approvedLines)} />
                <DetailRow label="Plan principal" value={record.approvedPlan.planName} />
                {record.approvedPlan.additionalPlans.map((p, i) => (
                  <DetailRow key={i} label={`Adicional ${i + 1}`} value={p.planName} />
                ))}
                <DetailRow
                  label="Equipo"
                  value={
                    record.approvedEquipmentDetail?.commercialName ?? "Sin equipo"
                  }
                />
                <DetailRow
                  label="Total mensual"
                  value={formatCurrency(record.approvedMonthlyValue)}
                />
                <DetailRow
                  label="Saldo restante"
                  value={formatCurrency(record.remainingCredit)}
                />
                <p className="mt-2 text-[13px] text-muted">{record.recommendation}</p>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
