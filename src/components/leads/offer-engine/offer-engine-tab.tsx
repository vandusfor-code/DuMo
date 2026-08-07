"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Smartphone,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useOfferSimulationDetail,
  useOfferSimulationHistory,
  useSimulateOffer,
} from "@/hooks/use-offer-engine";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  OFFER_SALE_TYPE_LABELS,
  type OfferPlanAlternative,
  type OfferSaleType,
  type OfferSimulationRecord,
} from "@/types/offer-engine";
import {
  SectionCard,
  SectionCardBody,
  SectionCardHeader,
} from "@/components/leads/premium/section-card";
import { cn } from "@/lib/utils";
import { OfferEngineDetailModal } from "./offer-engine-detail-modal";

const LOADING_MESSAGES = [
  "Analizando capacidad comercial...",
  "Consultando catálogo de planes...",
  "Validando cupos...",
  "Generando alternativas...",
];

const LINE_OPTIONS = [1, 2, 3, 4, 5] as const;

type FormState = {
  saleType: OfferSaleType;
  requestedLines: number;
  lineCredit: string;
  equipmentCredit: string;
  wantsEquipment: boolean;
};

const DEFAULT_FORM: FormState = {
  saleType: "portability",
  requestedLines: 1,
  lineCredit: "",
  equipmentCredit: "",
  wantsEquipment: false,
};

function parseMoney(value: string): number {
  const n = Number(value.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function OfferEngineTab({ conversationId }: { conversationId: string }) {
  const simulate = useSimulateOffer(conversationId);
  const historyQuery = useOfferSimulationHistory(conversationId);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<OfferSimulationRecord | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailQuery = useOfferSimulationDetail(detailId);

  useEffect(() => {
    if (!simulate.isPending) return;
    const timer = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 700);
    return () => clearInterval(timer);
  }, [simulate.isPending]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setResult(null);
  };

  const handleSubmit = async () => {
    const lineCredit = parseMoney(form.lineCredit);
    if (lineCredit <= 0) return;

    try {
      const res = await simulate.mutateAsync({
        saleType: form.saleType,
        requestedLines: form.requestedLines,
        lineCredit,
        equipmentCredit: parseMoney(form.equipmentCredit),
        wantsEquipment: form.wantsEquipment,
      });
      setResult(res);
    } catch {
      /* error shown below */
    }
  };

  const canSubmit = parseMoney(form.lineCredit) > 0 && !simulate.isPending;

  const viableAlternatives = result?.alternatives.filter((a) => a.viable) ?? [];
  const nonViableAlternatives = result?.alternatives.filter((a) => !a.viable) ?? [];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,35%)_minmax(0,1fr)]">
        <SectionCard>
          <SectionCardHeader title="Datos de la simulación" />
          <SectionCardBody className="space-y-4 pt-0">
            <Field label="Tipo de venta">
              <Select
                value={form.saleType}
                onValueChange={(v) => setForm((f) => ({ ...f, saleType: v as OfferSaleType }))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(OFFER_SALE_TYPE_LABELS) as [OfferSaleType, string][]).map(
                    ([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cantidad de líneas solicitadas">
              <Select
                value={String(form.requestedLines)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, requestedLines: Number(v) }))
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LINE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cupo Línea Móvil">
              <MoneyInput
                value={form.lineCredit}
                onChange={(v) => setForm((f) => ({ ...f, lineCredit: v }))}
                placeholder="80.000"
              />
            </Field>

            <Field label="Cupo Equipo">
              <MoneyInput
                value={form.equipmentCredit}
                onChange={(v) => setForm((f) => ({ ...f, equipmentCredit: v }))}
                placeholder="15.000"
              />
            </Field>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3">
              <input
                type="checkbox"
                checked={form.wantsEquipment}
                onChange={(e) =>
                  setForm((f) => ({ ...f, wantsEquipment: e.target.checked }))
                }
                className="size-4 rounded border-line accent-brand"
              />
              <span className="text-[14px] font-medium text-ink">El cliente desea equipo</span>
            </label>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
                className="h-11 w-full bg-brand hover:bg-brand-hover"
              >
                {simulate.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Generar Oferta
                  </>
                )}
              </Button>
              <Button type="button" variant="secondary" className="h-11 w-full" onClick={resetForm}>
                Nueva simulación
              </Button>
            </div>

            {simulate.isError ? (
              <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-3 py-2.5 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {simulate.error instanceof Error
                  ? simulate.error.message
                  : "No se pudo generar la oferta."}
              </div>
            ) : null}
          </SectionCardBody>
        </SectionCard>

        <div className="min-w-0 space-y-5">
          {simulate.isPending ? (
            <SectionCard>
              <SectionCardBody className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-12">
                <Loader2 className="size-10 animate-spin text-brand" />
                <p className="text-[15px] font-medium text-ink">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              </SectionCardBody>
            </SectionCard>
          ) : result ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-card/40 px-4 py-3">
                <p className="text-[14px] text-ink">
                  <span className="font-semibold">{result.viableCount}</span> alternativa
                  {result.viableCount === 1 ? "" : "s"} comercial
                  {result.viableCount === 1 ? "" : "es"} viable
                  {result.viableCount === 1 ? "" : "s"} de{" "}
                  <span className="font-semibold">{result.alternatives.length}</span> planes
                  evaluados.
                </p>
              </div>

              {viableAlternatives.length > 0 ? (
                <div className="space-y-4">
                  {viableAlternatives.map((alt) => (
                    <PlanAlternativeCard key={alt.planId} alternative={alt} />
                  ))}
                </div>
              ) : (
                <SectionCard>
                  <SectionCardBody className="py-8 text-center">
                    <XCircle className="mx-auto size-10 text-danger-ink/60" />
                    <p className="mt-3 text-[15px] font-medium text-ink">
                      Ningún plan es viable con los cupos ingresados.
                    </p>
                    <p className="mt-1 text-[13px] text-muted">
                      Revisa el cupo línea o reduce la cantidad de líneas solicitadas.
                    </p>
                  </SectionCardBody>
                </SectionCard>
              )}

              {nonViableAlternatives.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-[13px] font-medium text-muted">Planes no viables</p>
                  {nonViableAlternatives.map((alt) => (
                    <PlanAlternativeCard key={alt.planId} alternative={alt} compact />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <SectionCard>
              <SectionCardBody className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12 text-center">
                <Sparkles className="size-10 text-brand/40" />
                <p className="max-w-sm text-[15px] font-medium text-ink">
                  Ingresa los cupos y presiona Generar Oferta
                </p>
                <p className="max-w-sm text-[13px] text-muted">
                  El motor evaluará automáticamente Plan W, Plan O, Plan M y el resto del catálogo.
                </p>
              </SectionCardBody>
            </SectionCard>
          )}

          <OfferHistoryPanel
            items={historyQuery.data ?? []}
            isLoading={historyQuery.isLoading}
            onViewDetail={setDetailId}
          />
        </div>
      </div>

      <OfferEngineDetailModal
        open={detailId !== null}
        record={detailQuery.data ?? null}
        isLoading={detailQuery.isLoading}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

function PlanAlternativeCard({
  alternative,
  compact = false,
}: {
  alternative: OfferPlanAlternative;
  compact?: boolean;
}) {
  const approved = alternative.viable;

  return (
    <SectionCard
      className={cn(
        approved ? "border-success/25" : "border-line opacity-90",
        compact && "scale-[0.98]",
      )}
    >
      <SectionCardBody className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[20px] font-bold text-ink">{alternative.planName}</h3>
            {!approved && alternative.notViableReason ? (
              <p className="mt-1 text-[13px] text-danger-ink">{alternative.notViableReason}</p>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold",
              approved
                ? "border-success/20 bg-success-soft text-success-ink"
                : "border-line bg-card text-muted",
            )}
          >
            {approved ? (
              <CheckCircle2 className="size-3.5" />
            ) : (
              <XCircle className="size-3.5" />
            )}
            {alternative.statusLabel}
          </span>
        </div>

        {approved ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <Metric label="Cargo fijo línea principal" value={formatCurrency(alternative.mainLineFixedCharge)} />
              <Metric
                label={
                  alternative.additionalLinesCount > 0
                    ? `Líneas adicionales (${alternative.additionalLinesCount} × ${formatCurrency(alternative.additionalLineUnitPrice)})`
                    : "Líneas adicionales"
                }
                value={
                  alternative.additionalLinesCount > 0
                    ? formatCurrency(alternative.additionalLinesTotal)
                    : "—"
                }
              />
              <Metric
                label="Cargo fijo total mensual"
                value={formatCurrency(alternative.totalMonthlyFixed)}
                highlight
              />
              <Metric label="Cupo consumido" value={formatCurrency(alternative.consumedCredit)} />
              <Metric label="Cupo restante" value={formatCurrency(alternative.remainingCredit)} />
            </div>

            {alternative.wantsEquipment ? (
              <div className="rounded-xl border border-brand/15 bg-brand-soft/30 p-4">
                <div className="flex items-center gap-2 text-brand">
                  <Smartphone className="size-4" />
                  <p className="text-[13px] font-semibold">Equipos compatibles</p>
                </div>
                {alternative.equipmentOnlyWithoutDevice ? (
                  <p className="mt-2 text-[13px] text-ink">
                    Esta oferta solo es viable sin equipo.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink">
                      Con esta oferta puedes ofrecer cualquier equipo cuya cuota mensual sea
                      menor o igual a{" "}
                      <span className="font-semibold text-brand">
                        {formatCurrency(alternative.maxEquipmentInstallment)}
                      </span>
                      .
                    </p>
                    {alternative.eligibleEquipment.length > 0 ? (
                      <ul className="mt-3 space-y-1.5">
                        {alternative.eligibleEquipment.map((eq) => (
                          <li
                            key={eq.id}
                            className="flex justify-between gap-3 rounded-lg bg-white/70 px-3 py-2 text-[13px]"
                          >
                            <span className="font-medium text-ink">
                              {eq.commercialName || `${eq.brand} ${eq.model}`.trim()}
                            </span>
                            <span className="shrink-0 text-muted">
                              Cuota {formatCurrency(eq.installmentValue)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[13px] text-muted">
                        Ningún equipo del catálogo cumple el cupo disponible.
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : null}

            <Button type="button" disabled title="Disponible próximamente" className="h-10 w-full opacity-50">
              Aplicar esta oferta
            </Button>
          </>
        ) : null}
      </SectionCardBody>
    </SectionCard>
  );
}

function OfferHistoryPanel({
  items,
  isLoading,
  onViewDetail,
}: {
  items: Array<{
    id: string;
    createdAt: string;
    saleType: OfferSaleType;
    requestedSummary: string;
    resultSummary: string;
    viableCount: number;
  }>;
  isLoading: boolean;
  onViewDetail: (id: string) => void;
}) {
  return (
    <SectionCard>
      <SectionCardHeader title="Historial de simulaciones" />
      <SectionCardBody className="pt-0">
        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-[13px] text-muted">
            <Loader2 className="size-4 animate-spin" /> Cargando historial...
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-[13px] text-muted">Aún no hay simulaciones para este lead.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="pb-2 pr-3 font-medium">Fecha</th>
                  <th className="pb-2 pr-3 font-medium">Tipo Venta</th>
                  <th className="pb-2 pr-3 font-medium">Solicitado</th>
                  <th className="pb-2 pr-3 font-medium">Resultado</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line/60">
                    <td className="py-2.5 pr-3 text-ink">{formatShortDate(item.createdAt)}</td>
                    <td className="py-2.5 pr-3">{OFFER_SALE_TYPE_LABELS[item.saleType]}</td>
                    <td className="py-2.5 pr-3">{item.requestedSummary}</td>
                    <td className="py-2.5 pr-3">{item.resultSummary}</td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={() => onViewDetail(item.id)}
                        className="font-medium text-brand hover:underline"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCardBody>
    </SectionCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      className="h-11 w-full rounded-xl border border-line bg-white px-4 text-[14px] text-ink outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(109,40,255,0.12)]"
    />
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line/70 bg-card/40 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-0.5 text-[15px] font-semibold", highlight ? "text-brand" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}
