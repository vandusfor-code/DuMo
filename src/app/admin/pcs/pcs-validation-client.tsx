"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PcsValidationProgress } from "@/components/admin/pcs/pcs-validation-progress";
import { PcsResultsTable } from "@/components/admin/pcs/pcs-results-table";
import { PcsResultActions } from "@/components/admin/pcs/pcs-result-actions";
import { usePcsUploadPreview, usePcsValidate, usePcsJobStatus } from "@/hooks/use-pcs-validation";
import {
  parsePcsWorkbook,
  PCS_FORMAT_ERROR,
} from "@/lib/pcs-validation-import";
import { PCS_VALIDATION_MAX_RECOMMENDED, type PcsValidationInputRow } from "@/lib/pcs-validation";

const LAST_JOB_KEY = "pcs_validation_last_job_id";

type Step = "select" | "preview" | "validating" | "result";

export function PcsValidationClient() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState<PcsValidationInputRow[]>([]);
  const [totalNumeros, setTotalNumeros] = useState(0);
  const [preview, setPreview] = useState<PcsValidationInputRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const uploadPreview = usePcsUploadPreview();
  const validate = usePcsValidate();
  const job = usePcsJobStatus(jobId);

  // Reconexión: si había un job en curso (pestaña cerrada/recargada), retómalo.
  useEffect(() => {
    const stored = window.localStorage.getItem(LAST_JOB_KEY);
    if (stored) {
      setJobId(stored);
      setStep("validating");
    }
  }, []);

  useEffect(() => {
    if (job.data?.status === "done" || job.data?.status === "error") {
      setStep("result");
    }
  }, [job.data?.status]);

  const reset = () => {
    setStep("select");
    setFileName("");
    setRawRows([]);
    setTotalNumeros(0);
    setPreview([]);
    setError(null);
    setJobId(null);
    window.localStorage.removeItem(LAST_JOB_KEY);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Solo se aceptan archivos .xlsx");
      return;
    }
    setError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const rows = parsePcsWorkbook(buffer);
      if (rows.length === 0) {
        setError("El archivo no contiene filas de datos.");
        return;
      }
      setRawRows(rows);
      const result = await uploadPreview.mutateAsync(rows);
      setTotalNumeros(result.totalNumeros);
      setPreview(result.preview);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : PCS_FORMAT_ERROR);
    }
  };

  const handleValidate = async () => {
    setError(null);
    try {
      const { jobId: newJobId } = await validate.mutateAsync(rawRows);
      window.localStorage.setItem(LAST_JOB_KEY, newJobId);
      setJobId(newJobId);
      setStep("validating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar la validación.");
    }
  };

  const resultados = job.data?.resultados ?? [];
  const counts = {
    validos: resultados.filter((r) => r.estado === "valido").length,
    noValidos: resultados.filter((r) => r.estado === "no_valido").length,
    invalidos: resultados.filter((r) => r.estado === "invalido" || r.estado === "error").length,
  };

  return (
    <div>
      <AdminPageHeader title="Validación PCS" subtitle="Valida números con WhatsApp activo antes de enviar por Dulabs" />

      <Card className="p-6">
        {step === "select" && (
          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={uploadPreview.isPending}
              onClick={() => inputRef.current?.click()}
            >
              {uploadPreview.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Subir archivo Excel
            </Button>
            <p className="text-[12px] text-muted">
              Hoja &quot;Numeros&quot;, columna A = PCS, columna B = Nombre (opcional). Encabezados en fila 1.
            </p>
            {error ? (
              <p className="flex items-start gap-2 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-[13px] text-ink">
              Archivo cargado: <span className="font-medium">{fileName}</span>
            </p>
            <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px]">
              <p className="font-medium text-ink">{totalNumeros} números detectados</p>
              {totalNumeros > PCS_VALIDATION_MAX_RECOMMENDED ? (
                <p className="mt-1 text-warning-ink">
                  Se recomienda validar en lotes de máximo {PCS_VALIDATION_MAX_RECOMMENDED} números.
                </p>
              ) : null}
            </div>
            {preview.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-line p-3">
                <p className="text-[12px] font-semibold text-muted">Vista previa</p>
                <ul className="mt-2 space-y-1 text-[13px] text-ink">
                  {preview.map((row, i) => (
                    <li key={i}>
                      {row.pcs}
                      {row.nombre ? ` — ${row.nombre}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={reset}>
                Elegir otro archivo
              </Button>
              <Button type="button" disabled={validate.isPending} onClick={() => void handleValidate()}>
                {validate.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Validar números
              </Button>
            </div>
            {error ? (
              <p className="flex items-start gap-2 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {error}
              </p>
            ) : null}
          </div>
        )}

        {step === "validating" && (
          <div className="space-y-4">
            <PcsValidationProgress
              procesados={job.data?.progreso.procesados ?? 0}
              total={job.data?.progreso.total ?? 0}
            />
          </div>
        )}

        {step === "result" && job.data && (
          <div className="space-y-5">
            {job.data.status === "error" ? (
              <p className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/40 px-4 py-3 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {job.data.error ?? "No se pudo completar la validación."}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="success">✅ {counts.validos} con WhatsApp</Badge>
                  <Badge tone="danger">❌ {counts.noValidos} sin WhatsApp</Badge>
                  <Badge tone="warning">⚠️ {counts.invalidos} número inválido / error</Badge>
                </div>
                {jobId ? <PcsResultActions jobId={jobId} rows={resultados} /> : null}
                <PcsResultsTable rows={resultados} />
              </>
            )}
            <div className="flex justify-end">
              <Button type="button" variant="secondary" onClick={reset}>
                Nueva validación
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
