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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
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
              <MetaRow label="Líneas solicitadas" value={String(record.requestedLines)} />
              <MetaRow label="Cupo Línea" value={formatCurrency(record.lineCredit)} />
              <MetaRow label="Cupo Equipo" value={formatCurrency(record.equipmentCredit)} />
              <MetaRow
                label="Desea equipo"
                value={record.wantsEquipment ? "Sí" : "No"}
              />

              <div className="space-y-4">
                {record.alternatives.map((alt) => (
                  <div
                    key={alt.planId}
                    className="rounded-xl border border-line p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">{alt.planName}</p>
                      <span className="text-[12px] font-medium text-muted">{alt.statusLabel}</span>
                    </div>
                    {alt.viable ? (
                      <div className="mt-3 space-y-1 text-[13px]">
                        <DetailRow
                          label="Cargo fijo total"
                          value={formatCurrency(alt.totalMonthlyFixed)}
                        />
                        <DetailRow
                          label="Cupo restante"
                          value={formatCurrency(alt.remainingCredit)}
                        />
                        {alt.wantsEquipment && alt.maxEquipmentInstallment > 0 ? (
                          <DetailRow
                            label="Cuota máx. equipo"
                            value={formatCurrency(alt.maxEquipmentInstallment)}
                          />
                        ) : null}
                        {alt.eligibleEquipment.length > 0 ? (
                          <p className="pt-1 text-muted">
                            {alt.eligibleEquipment.length} equipo(s) compatible(s)
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-[13px] text-danger-ink">{alt.notViableReason}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
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
