"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  classifyContacts,
  detectColumnMapping,
  FIELD_VARIABLE_NAMES,
  parseCampaignWorkbook,
} from "@/lib/campaigns/contact-import";
import {
  useCampaign,
  useCampaignPreview,
  useCreateCampaign,
  useImportCampaignContacts,
  useStartCampaign,
  useUpdateCampaignMessage,
  useUpdateCampaignSettings,
} from "@/hooks/use-campaigns";
import type { CampaignColumnField, CampaignColumnMapping, CampaignValidationSummary } from "@/types/campaign";

type Step = "datos" | "mapeo" | "validacion" | "mensaje" | "configuracion" | "confirmacion";

const STEP_LABELS: Record<Step, string> = {
  datos: "Datos",
  mapeo: "Mapeo de columnas",
  validacion: "Validación",
  mensaje: "Mensaje",
  configuracion: "Configuración",
  confirmacion: "Confirmar e iniciar",
};

const FIELD_OPTIONS: { value: CampaignColumnField | "none"; label: string }[] = [
  { value: "none", label: "No usar" },
  { value: "name", label: "Nombre" },
  { value: "phone", label: "Teléfono" },
  { value: "rut", label: "RUT" },
  { value: "company", label: "Compañía" },
];

function StepShell({
  step,
  title,
  children,
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled,
  nextLoading,
}: {
  step: Step;
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
}) {
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-brand">{STEP_LABELS[step]}</p>
      <h2 className="mt-1 text-[20px] font-semibold text-ink">{title}</h2>
      <div className="mt-5 space-y-4">{children}</div>
      <div className="mt-7 flex justify-between gap-2">
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Atrás
          </Button>
        ) : (
          <span />
        )}
        {onNext ? (
          <Button onClick={onNext} disabled={nextDisabled || nextLoading}>
            {nextLoading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {nextLabel}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

export function NewCampaignWizard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("datos");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<CampaignColumnMapping>({});
  const [validationSummary, setValidationSummary] = useState<CampaignValidationSummary | null>(null);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [settings, setSettings] = useState({ intervalSeconds: 60, concurrency: 1, maxRetries: 0 });
  const [formError, setFormError] = useState<string | null>(null);

  const createCampaign = useCreateCampaign();
  const importContacts = useImportCampaignContacts(campaignId ?? "");
  const updateMessage = useUpdateCampaignMessage(campaignId ?? "");
  const updateSettings = useUpdateCampaignSettings(campaignId ?? "");
  const startCampaign = useStartCampaign(campaignId ?? "");
  const { data: preview, isFetching: previewLoading } = useCampaignPreview(campaignId, step === "mensaje" && messageTemplate.trim().length > 0);
  const { data: detail } = useCampaign(step === "confirmacion" ? campaignId : null);

  const clientPreview = useMemo(() => {
    if (rows.length === 0) return null;
    const classified = classifyContacts(rows, mapping, () => ({ suppressed: false, isOptOut: false }));
    return {
      total: classified.length,
      eligible: classified.filter((c) => c.status === "PENDING").length,
      invalid: classified.filter((c) => c.status === "INVALID").length,
      duplicate: classified.filter((c) => c.status === "DUPLICATE").length,
    };
  }, [rows, mapping]);

  const availableVariables = useMemo(
    () =>
      [...new Set(Object.values(mapping).filter((f): f is Exclude<CampaignColumnField, null> => Boolean(f)))].map(
        (f) => FIELD_VARIABLE_NAMES[f],
      ),
    [mapping],
  );

  const handleFile = async (file: File) => {
    setFormError(null);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseCampaignWorkbook(buffer);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setFormError("El archivo no tiene filas de datos para importar.");
        return;
      }
      setFileName(file.name);
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setMapping(detectColumnMapping(parsed.headers));
    } catch {
      setFormError("No se pudo leer el archivo. Verifica que sea un Excel (.xlsx) o CSV válido.");
    }
  };

  const goToMapeo = async () => {
    setFormError(null);
    if (!name.trim()) return setFormError("El nombre de la campaña es obligatorio.");
    if (rows.length === 0) return setFormError("Sube un archivo con contactos.");
    try {
      let id = campaignId;
      if (!id) {
        const campaign = await createCampaign.mutateAsync({ name, description });
        id = campaign.id;
        setCampaignId(id);
      }
      setStep("mapeo");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo crear la campaña.");
    }
  };

  const confirmMapping = async () => {
    setFormError(null);
    if (!campaignId) return;
    if (!Object.values(mapping).includes("phone")) {
      setFormError("Debes mapear una columna como Teléfono.");
      return;
    }
    try {
      const summary = await importContacts.mutateAsync({ rows, mapping });
      setValidationSummary(summary);
      setStep("validacion");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo validar el archivo.");
    }
  };

  const saveMessageAndContinue = async () => {
    setFormError(null);
    if (!messageTemplate.trim()) return setFormError("Escribe el mensaje de la campaña.");
    try {
      await updateMessage.mutateAsync(messageTemplate);
      setStep("configuracion");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar el mensaje.");
    }
  };

  const saveSettingsAndContinue = async () => {
    setFormError(null);
    try {
      await updateSettings.mutateAsync(settings);
      setStep("confirmacion");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar la configuración.");
    }
  };

  const launch = async () => {
    setFormError(null);
    if (!campaignId) return;
    try {
      await startCampaign.mutateAsync();
      router.push(`/admin/campanas/${campaignId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo iniciar la campaña.");
    }
  };

  const estimatedMinutes = validationSummary
    ? Math.round((validationSummary.eligible * settings.intervalSeconds) / 60)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader title="Nueva campaña" subtitle="Sube tu lista, arma el mensaje y lanza el envío controlado." />

      {formError ? (
        <p className="mx-auto max-w-2xl rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
          {formError}
        </p>
      ) : null}

      {step === "datos" ? (
        <StepShell step={step} title="Nombre y archivo de contactos" onNext={goToMapeo} nextLoading={createCampaign.isPending}>
          <label className="block">
            <span className="text-[13px] text-muted">Nombre de campaña</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Portabilidad — Leads Martes"
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Descripción (opcional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 min-h-[60px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
            />
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          {fileName ? (
            <div className="flex items-center justify-between rounded-xl border border-line bg-canvas/40 px-4 py-3 text-[13px]">
              <span className="text-ink">{fileName} — {rows.length} filas</span>
              <button type="button" className="font-semibold text-brand" onClick={() => fileInputRef.current?.click()}>
                Cambiar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-canvas/50 px-4 py-10 text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <Upload className="size-8" />
              <span className="text-[14px] font-medium">Arrastra el Excel/CSV o haz clic para elegirlo</span>
              <span className="text-[12px]">El export de Leads por fecha ya viene en este formato.</span>
            </button>
          )}
        </StepShell>
      ) : null}

      {step === "mapeo" ? (
        <StepShell
          step={step}
          title="Confirma qué columna es cada dato"
          onBack={() => setStep("datos")}
          onNext={confirmMapping}
          nextLoading={importContacts.isPending}
        >
          <div className="space-y-2">
            {headers.map((header) => (
              <div key={header} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-2.5">
                <span className="text-[13px] font-medium text-ink">{header}</span>
                <select
                  value={mapping[header] ?? "none"}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [header]: e.target.value === "none" ? null : (e.target.value as CampaignColumnField),
                    }))
                  }
                  className="h-9 rounded-lg border border-line px-2 text-[13px]"
                >
                  {FIELD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {clientPreview ? (
            <p className="text-[12px] text-muted">
              Vista previa: {clientPreview.eligible} elegibles, {clientPreview.invalid} inválidos, {clientPreview.duplicate} duplicados
              — de {clientPreview.total} filas. Se confirma al continuar.
            </p>
          ) : null}
        </StepShell>
      ) : null}

      {step === "validacion" && validationSummary ? (
        <StepShell step={step} title="Resultado de la validación" onBack={() => setStep("mapeo")} onNext={() => setStep("mensaje")}>
          <p className="text-[14px] text-ink">{validationSummary.total} registros encontrados</p>
          <ul className="space-y-1.5 text-[14px]">
            <li className="text-success-ink">✓ {validationSummary.eligible} registros elegibles</li>
            {validationSummary.duplicate > 0 ? <li className="text-warning-ink">⚠ {validationSummary.duplicate} duplicados</li> : null}
            {validationSummary.invalid > 0 ? <li className="text-warning-ink">⚠ {validationSummary.invalid} teléfonos inválidos</li> : null}
            {validationSummary.excluded > 0 ? <li className="text-muted">⊘ {validationSummary.excluded} en lista de exclusión</li> : null}
            {validationSummary.optedOut > 0 ? <li className="text-muted">⊘ {validationSummary.optedOut} dados de baja (opt-out)</li> : null}
          </ul>
          {validationSummary.eligible === 0 ? (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-[13px] text-danger-ink">
              No hay contactos elegibles — revisa el mapeo o el archivo.
            </p>
          ) : null}
        </StepShell>
      ) : null}

      {step === "mensaje" ? (
        <StepShell
          step={step}
          title="Escribe el mensaje"
          onBack={() => setStep("validacion")}
          onNext={saveMessageAndContinue}
          nextLoading={updateMessage.isPending}
          nextDisabled={!messageTemplate.trim()}
        >
          <div className="flex flex-wrap gap-1.5">
            {availableVariables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setMessageTemplate((prev) => `${prev}{{${v}}}`)}
                className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand hover:bg-brand/15"
              >
                {`{{${v}}}`}
              </button>
            ))}
          </div>
          <textarea
            value={messageTemplate}
            onChange={(e) => setMessageTemplate(e.target.value)}
            placeholder={`Hola {{nombre}} 👋\n\nVimos que hace unos días nos escribiste...`}
            className="min-h-[160px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
          />
          {previewLoading ? (
            <p className="text-[12px] text-muted">Generando vista previa...</p>
          ) : preview && preview.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Vista previa (ejemplos reales)</p>
              {preview.map((p) => (
                <div key={p.contactId} className="rounded-xl border border-line bg-canvas/40 p-3 text-[13px]">
                  <p className="font-medium text-ink">{p.name || p.phone}</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{p.text}</p>
                  {p.missingVariables.length > 0 ? (
                    <p className="mt-1 text-danger-ink">Falta: {p.missingVariables.join(", ")} — este contacto no se enviará.</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </StepShell>
      ) : null}

      {step === "configuracion" ? (
        <StepShell
          step={step}
          title="Configuración de envío"
          onBack={() => setStep("mensaje")}
          onNext={saveSettingsAndContinue}
          nextLoading={updateSettings.isPending}
        >
          <p className="text-[13px] text-muted">
            Contactos elegibles: <span className="font-semibold text-ink">{validationSummary?.eligible ?? 0}</span>
          </p>
          <label className="block">
            <span className="text-[13px] text-muted">Intervalo entre mensajes (segundos)</span>
            <input
              type="number"
              min={1}
              value={settings.intervalSeconds}
              onChange={(e) => setSettings((s) => ({ ...s, intervalSeconds: Number(e.target.value) }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Envíos simultáneos</span>
            <input
              type="number"
              min={1}
              value={settings.concurrency}
              onChange={(e) => setSettings((s) => ({ ...s, concurrency: Number(e.target.value) }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Reintentos</span>
            <input
              type="number"
              min={0}
              value={settings.maxRetries}
              onChange={(e) => setSettings((s) => ({ ...s, maxRetries: Number(e.target.value) }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <ul className="space-y-1 text-[13px] text-muted">
            <li>✓ Se pausa automáticamente ante errores consecutivos o proveedor caído</li>
            <li>✓ Exclusión automática por opt-out — se revisa antes de cada envío</li>
            <li>✓ Cada evento queda registrado y visible en el historial de la campaña</li>
          </ul>
        </StepShell>
      ) : null}

      {step === "confirmacion" ? (
        <StepShell
          step={step}
          title="Revisar campaña"
          onBack={() => setStep("configuracion")}
          onNext={launch}
          nextLabel="Iniciar campaña"
          nextLoading={startCampaign.isPending}
        >
          <dl className="space-y-2.5 text-[14px]">
            <div className="flex justify-between"><dt className="text-muted">Campaña</dt><dd className="font-medium text-ink">{name}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Contactos elegibles</dt><dd className="font-medium text-ink">{validationSummary?.eligible ?? detail?.campaign.eligibleContacts ?? 0}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Intervalo</dt><dd className="font-medium text-ink">{settings.intervalSeconds} segundos</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Concurrencia</dt><dd className="font-medium text-ink">{settings.concurrency}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Tiempo estimado</dt><dd className="font-medium text-ink">≈ {estimatedMinutes} min</dd></div>
          </dl>
        </StepShell>
      ) : null}
    </div>
  );
}
