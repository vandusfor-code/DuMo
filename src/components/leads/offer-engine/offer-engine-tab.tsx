"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Smartphone,
  Sparkles,
  Wallet,
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
import { usePlans } from "@/hooks/use-leads";
import { useActiveEquipment } from "@/hooks/use-equipment-catalog";
import {
  useOfferSimulationDetail,
  useOfferSimulationHistory,
  useSimulateOffer,
} from "@/hooks/use-offer-engine";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  OFFER_SALE_TYPE_LABELS,
  type OfferSaleType,
  type OfferSimulationRecord,
  type OfferSimulationStatus,
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
  "Validando cupo equipo...",
  "Calculando líneas...",
  "Optimizando oferta...",
];

const LINE_OPTIONS = [1, 2, 3, 4, 5] as const;
const ADDITIONAL_OPTIONS = [1, 2, 3, 4] as const;

type FormState = {
  saleType: OfferSaleType;
  requestedLines: number;
  mainPlanId: string;
  hasAdditional: boolean;
  additionalCount: number;
  additionalPlanIds: string[];
  equipmentId: string | null;
  lineCredit: string;
  equipmentCredit: string;
};

const DEFAULT_FORM: FormState = {
  saleType: "portability",
  requestedLines: 1,
  mainPlanId: "",
  hasAdditional: false,
  additionalCount: 1,
  additionalPlanIds: [""],
  equipmentId: null,
  lineCredit: "",
  equipmentCredit: "",
};

function parseMoney(value: string): number {
  const n = Number(value.replace(/\D/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function StatusBadge({ status }: { status: OfferSimulationStatus }) {
  const map = {
    APPROVED: {
      label: "Oferta aprobada",
      className: "bg-success-soft text-success-ink border-success/20",
      icon: CheckCircle2,
    },
    OPTIMIZED: {
      label: "Oferta optimizada",
      className: "bg-warning-soft text-warning-ink border-warning/20",
      icon: Sparkles,
    },
    REJECTED: {
      label: "Oferta rechazada",
      className: "bg-danger-soft text-danger-ink border-danger/20",
      icon: XCircle,
    },
  }[status];
  const Icon = map.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold",
        map.className,
      )}
    >
      <Icon className="size-4" />
      {map.label}
    </span>
  );
}

function CreditMiniCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-card/60 p-3">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-[16px] font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-muted">{sub}</p> : null}
    </div>
  );
}

export function OfferEngineTab({ conversationId }: { conversationId: string }) {
  const { data: plans = [], isLoading: plansLoading } = usePlans();
  const { data: equipmentList = [], isLoading: equipmentLoading } = useActiveEquipment();
  const simulate = useSimulateOffer(conversationId);
  const historyQuery = useOfferSimulationHistory(conversationId);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [result, setResult] = useState<OfferSimulationRecord | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailQuery = useOfferSimulationDetail(detailId);

  useEffect(() => {
    if (plans.length > 0 && !form.mainPlanId) {
      setForm((f) => ({ ...f, mainPlanId: plans[0].id }));
    }
  }, [plans, form.mainPlanId]);

  useEffect(() => {
    if (!simulate.isPending) return;
    const timer = setInterval(() => {
      setLoadingMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 700);
    return () => clearInterval(timer);
  }, [simulate.isPending]);

  const selectedEquipment = useMemo(
    () => equipmentList.find((e) => e.id === form.equipmentId) ?? null,
    [equipmentList, form.equipmentId],
  );

  const handleLinesChange = (lines: number) => {
    setForm((f) => {
      const hasAdditional = lines > 1;
      const additionalCount = hasAdditional ? Math.max(1, lines - 1) : 1;
      const additionalPlanIds = Array.from({ length: additionalCount }, (_, i) =>
        f.additionalPlanIds[i] ?? f.mainPlanId ?? plans[0]?.id ?? "",
      );
      return {
        ...f,
        requestedLines: lines,
        hasAdditional,
        additionalCount,
        additionalPlanIds,
      };
    });
  };

  const handleAdditionalCountChange = (count: number) => {
    setForm((f) => {
      const additionalPlanIds = Array.from({ length: count }, (_, i) =>
        f.additionalPlanIds[i] ?? f.mainPlanId ?? plans[0]?.id ?? "",
      );
      return {
        ...f,
        additionalCount: count,
        requestedLines: 1 + count,
        additionalPlanIds,
      };
    });
  };

  const resetForm = () => {
    setForm({
      ...DEFAULT_FORM,
      mainPlanId: plans[0]?.id ?? "",
    });
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!form.mainPlanId) return;
    const lineCredit = parseMoney(form.lineCredit);
    const equipmentCredit = parseMoney(form.equipmentCredit);
    if (lineCredit <= 0) return;

    const additionalPlans = form.hasAdditional
      ? form.additionalPlanIds.slice(0, form.additionalCount).map((planId) => ({ planId }))
      : [];

    try {
      const res = await simulate.mutateAsync({
        saleType: form.saleType,
        requestedLines: form.requestedLines,
        mainPlanId: form.mainPlanId,
        additionalPlans,
        equipmentId: form.equipmentId,
        lineCredit,
        equipmentCredit,
      });
      setResult(res);
    } catch {
      /* error shown below */
    }
  };

  const canSubmit =
    form.mainPlanId &&
    parseMoney(form.lineCredit) > 0 &&
    !simulate.isPending &&
    !plansLoading;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(280px,35%)_minmax(0,1fr)]">
        {/* Columna izquierda — formulario */}
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

            <Field label="Cantidad líneas solicitadas">
              <Select
                value={String(form.requestedLines)}
                onValueChange={(v) => handleLinesChange(Number(v))}
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

            <Field label="Línea principal — Plan">
              <Select
                value={form.mainPlanId}
                onValueChange={(v) => setForm((f) => ({ ...f, mainPlanId: v }))}
                disabled={plansLoading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.womValue ? ` — ${formatCurrency(p.womValue)}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <span className="text-[14px] font-medium text-ink">¿Tiene líneas adicionales?</span>
              <div className="flex gap-2">
                <ToggleChip
                  active={form.hasAdditional}
                  label="Sí"
                  onClick={() => {
                    if (!form.hasAdditional) {
                      handleLinesChange(Math.max(2, form.requestedLines));
                      setForm((f) => ({ ...f, hasAdditional: true }));
                    }
                  }}
                />
                <ToggleChip
                  active={!form.hasAdditional}
                  label="No"
                  onClick={() => {
                    setForm((f) => ({
                      ...f,
                      hasAdditional: false,
                      requestedLines: 1,
                      additionalCount: 0,
                      additionalPlanIds: [],
                    }));
                  }}
                />
              </div>
            </div>

            {form.hasAdditional ? (
              <div className="space-y-3 rounded-xl border border-brand/15 bg-brand-soft/20 p-4">
                <Field label="Cantidad adicionales">
                  <Select
                    value={String(form.additionalCount)}
                    onValueChange={(v) => handleAdditionalCountChange(Number(v))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADDITIONAL_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {Array.from({ length: form.additionalCount }).map((_, i) => (
                  <Field key={i} label={`Línea adicional ${i + 1} — Plan`}>
                    <Select
                      value={form.additionalPlanIds[i] ?? ""}
                      onValueChange={(v) =>
                        setForm((f) => {
                          const ids = [...f.additionalPlanIds];
                          ids[i] = v;
                          return { ...f, additionalPlanIds: ids };
                        })
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Seleccionar plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                            {p.womValue ? ` — ${formatCurrency(p.womValue)}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
              </div>
            ) : null}

            <Field label="Equipo">
              <Select
                value={form.equipmentId ?? "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, equipmentId: v === "none" ? null : v }))
                }
                disabled={equipmentLoading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Sin equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin equipo</SelectItem>
                  {equipmentList.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.commercialName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {selectedEquipment ? (
              <div className="grid gap-2 rounded-xl border border-line bg-card/50 p-3 text-[13px]">
                <ReadOnlyRow label="Marca" value={selectedEquipment.brand} />
                <ReadOnlyRow label="Modelo" value={selectedEquipment.model} />
                <ReadOnlyRow label="Valor total" value={formatCurrency(selectedEquipment.totalValue)} />
                <ReadOnlyRow label="Pie" value={formatCurrency(selectedEquipment.downPayment)} />
                <ReadOnlyRow label="Cuotas" value={String(selectedEquipment.installmentsCount)} />
                <ReadOnlyRow
                  label="Valor cuota"
                  value={formatCurrency(selectedEquipment.installmentValue)}
                />
              </div>
            ) : null}

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
                    Consultar Oferta
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
                  : "No se pudo calcular la oferta."}
              </div>
            ) : null}
          </SectionCardBody>
        </SectionCard>

        {/* Columna derecha — resultado */}
        <div className="min-w-0 space-y-5">
          {simulate.isPending ? (
            <SectionCard>
              <SectionCardBody className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-12">
                <Loader2 className="size-10 animate-spin text-brand" />
                <p className="text-[15px] font-medium text-ink">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              </SectionCardBody>
            </SectionCard>
          ) : result ? (
            <OfferResultPanel result={result} />
          ) : (
            <SectionCard>
              <SectionCardBody className="flex min-h-[280px] flex-col items-center justify-center gap-3 py-12 text-center">
                <Sparkles className="size-10 text-brand/40" />
                <p className="max-w-sm text-[15px] font-medium text-ink">
                  Ingresa los cupos y presiona Consultar Oferta
                </p>
                <p className="max-w-sm text-[13px] text-muted">
                  El motor analizará automáticamente la mejor combinación comercial posible.
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

function OfferResultPanel({ result }: { result: OfferSimulationRecord }) {
  const mainPlan = result.approvedPlan;
  const equipment = result.approvedEquipmentDetail;

  return (
    <SectionCard>
      <SectionCardBody className="space-y-5 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[22px] font-bold text-ink">Resultado del análisis</h3>
            <p className="mt-1 text-[14px] text-muted">{result.recommendation}</p>
          </div>
          <StatusBadge status={result.status} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryBlock title="Cliente solicitó">
            <p>
              {result.requestedLines} línea{result.requestedLines === 1 ? "" : "s"} —{" "}
              {result.requestedPlan.planName}
            </p>
            {result.requestedPlan.additionalPlans.map((p, i) => (
              <p key={i} className="text-muted">
                Adicional {i + 1}: {p.planName}
              </p>
            ))}
            {result.requestedEquipmentDetail ? (
              <p>{result.requestedEquipmentDetail.commercialName}</p>
            ) : (
              <p className="text-muted">Sin equipo</p>
            )}
            <p className="font-semibold text-ink">
              {formatCurrency(result.requestedMonthlyValue)}/mes
            </p>
          </SummaryBlock>

          <SummaryBlock title="Oferta recomendada">
            <p>
              {result.approvedLines} línea{result.approvedLines === 1 ? "" : "s"} —{" "}
              {mainPlan.planName}
            </p>
            {mainPlan.additionalPlans.map((p, i) => (
              <p key={i} className="text-muted">
                Adicional {i + 1}: {p.planName}
              </p>
            ))}
            {equipment ? <p>{equipment.commercialName}</p> : <p className="text-muted">Sin equipo</p>}
            <p className="font-semibold text-brand">
              {formatCurrency(result.approvedMonthlyValue)}/mes
            </p>
          </SummaryBlock>
        </div>

        {result.status === "OPTIMIZED" ? (
          <div className="rounded-xl border border-warning/25 bg-warning-soft/50 p-4">
            <p className="text-[14px] font-semibold text-warning-ink">Optimización realizada</p>
            <p className="mt-1 text-[13px] text-warning-ink/90">
              La solicitud inicial no cumplía las reglas comerciales. El sistema encontró
              automáticamente una mejor combinación.
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-warning-ink">
              {result.removedEquipment ? (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" /> Equipo eliminado
                </li>
              ) : null}
              {result.removedLines > 0 ? (
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Se redujo de {result.requestedLines} a {result.approvedLines} líneas
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        {result.status === "REJECTED" ? (
          <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-4">
            <p className="text-[14px] font-semibold text-danger-ink">
              No fue posible encontrar una combinación comercial válida.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[13px] text-danger-ink/90">
              {result.rejectionReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CreditMiniCard
            icon={<Wallet className="size-4" />}
            label="Cupo Línea"
            value={formatCurrency(result.lineCredit)}
          />
          <CreditMiniCard
            icon={<CreditCard className="size-4" />}
            label="Utilizado"
            value={formatCurrency(result.approvedMonthlyValue)}
          />
          <CreditMiniCard
            icon={<Sparkles className="size-4" />}
            label="Disponible"
            value={formatCurrency(result.remainingCredit)}
          />
          {result.approvedEquipment || result.requestedEquipment ? (
            <CreditMiniCard
              icon={<Smartphone className="size-4" />}
              label="Cupo Equipo"
              value={formatCurrency(result.equipmentCredit)}
              sub={
                equipment
                  ? `Cuota: ${formatCurrency(equipment.installmentValue)}`
                  : undefined
              }
            />
          ) : null}
        </div>

        {result.approved ? (
          <Button
            type="button"
            disabled
            title="Disponible próximamente"
            className="h-11 w-full opacity-50"
          >
            Aplicar esta oferta
          </Button>
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
    status: OfferSimulationStatus;
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
                  <th className="pb-2 pr-3 font-medium">Estado</th>
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
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={item.status} />
                    </td>
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

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
        active ? "bg-brand text-white" : "bg-card text-muted hover:bg-brand-soft",
      )}
    >
      {label}
    </button>
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

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function SummaryBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card/40 p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="mt-2 space-y-1 text-[14px] text-ink">{children}</div>
    </div>
  );
}
