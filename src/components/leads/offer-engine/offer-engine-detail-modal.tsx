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

        <div className="space-y-4 p-5">
          {isLoading || !record ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted">
              <Loader2 className="size-5 animate-spin" />
              Cargando...
            </div>
          ) : (
            <>
              <MetaRow label="Fecha" value={formatDateTime(record.createdAt)} />
              <MetaRow label="Tipo venta" value={OFFER_SALE_TYPE_LABELS[record.saleType]} />
              <MetaRow label="Líneas solicitadas" value={String(record.requestedLines)} />
              <MetaRow label="Líneas evaluadas" value={String(record.evaluatedLines)} />
              <MetaRow label="Cupo Línea" value={formatCurrency(record.lineCredit)} />
              <MetaRow label="Cupo Equipo" value={formatCurrency(record.equipmentCredit)} />

              {record.optimizationMessage ? (
                <p className="rounded-lg bg-warning-soft/50 px-3 py-2 text-[13px] text-warning-ink">
                  {record.optimizationMessage}
                </p>
              ) : null}

              {record.offers.map((offer) => (
                <div key={offer.planId} className="rounded-xl border border-line p-4">
                  <p className="font-semibold text-ink">
                    #{offer.rank} {offer.planName}
                  </p>
                  <div className="mt-2 space-y-1 text-[13px]">
                    <Row label="Cargo fijo total" value={formatCurrency(offer.planMonthlyTotal)} />
                    <Row label="Margen línea" value={formatCurrency(offer.lineRemaining)} />
                    {offer.eligibleEquipment.length > 0 ? (
                      <Row
                        label="Equipos compatibles"
                        value={String(offer.eligibleEquipment.length)}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
