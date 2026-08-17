"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  EQUIPMENT_TEMPLATE_PATH,
  parseEquipmentWorkbook,
  type EquipmentImportPreviewRow,
} from "@/lib/equipment-import";
import type { EquipmentBulkImportResult } from "@/types/equipment";
import { useBulkImportEquipment } from "@/hooks/use-admin-equipment";

type Step = "select" | "preview" | "result";

export function EquipmentImportDialog({
  open,
  defaultCarrier,
  onClose,
}: {
  open: boolean;
  defaultCarrier: string;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bulkImport = useBulkImportEquipment();
  const [step, setStep] = useState<Step>("select");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<EquipmentImportPreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<EquipmentBulkImportResult | null>(null);

  const validRows = rows.filter((r) => r.input);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const reset = () => {
    setStep("select");
    setFileName("");
    setRows([]);
    setParseError(null);
    setResult(null);
    bulkImport.reset();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setParseError("Solo se aceptan archivos .xlsx");
      return;
    }
    setParseError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseEquipmentWorkbook(buffer, defaultCarrier);
      if (parsed.length === 0) {
        setParseError("El archivo no contiene filas de datos para importar.");
        setRows([]);
        setStep("select");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch {
      setParseError("No se pudo leer el archivo Excel. Verifica que sea la plantilla correcta.");
      setRows([]);
      setStep("select");
    }
  };

  const handleConfirm = async () => {
    if (validRows.length === 0) return;
    const payload = validRows.map((row) => ({
      rowNumber: row.rowNumber,
      equipment: row.input!,
    }));
    try {
      const importResult = await bulkImport.mutateAsync(payload);
      setResult(importResult);
      setStep("result");
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "No se pudo completar la importación.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="text-[17px] font-semibold text-ink">Cargar equipos desde Excel</h3>
        <p className="mt-1 text-[13px] text-muted">
          Usa la plantilla oficial con 14 columnas. Solo archivos .xlsx
        </p>

        {step === "select" && (
          <div className="mt-5 space-y-4">
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
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-4" />
              Seleccionar archivo .xlsx
            </Button>
            <p className="text-[12px] text-muted">
              ¿No tienes la plantilla?{" "}
              <a href={EQUIPMENT_TEMPLATE_PATH} download className="font-medium text-brand hover:underline">
                Descargar plantilla
              </a>
            </p>
            {parseError ? (
              <p className="flex items-start gap-2 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {parseError}
              </p>
            ) : null}
          </div>
        )}

        {step === "preview" && (
          <div className="mt-5 space-y-4">
            <p className="text-[13px] text-ink">
              Archivo: <span className="font-medium">{fileName}</span>
            </p>
            <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-[13px]">
              <p className="font-medium text-ink">
                {validRows.length} equipo{validRows.length === 1 ? "" : "s"} listo
                {validRows.length === 1 ? "" : "s"} para importar
              </p>
              {invalidRows.length > 0 ? (
                <p className="mt-1 text-muted">
                  {invalidRows.length} fila{invalidRows.length === 1 ? "" : "s"} con errores (no se
                  importarán)
                </p>
              ) : null}
            </div>

            {invalidRows.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-warning/25 bg-warning-soft/40 p-3">
                <p className="text-[12px] font-semibold text-warning-ink">Errores por fila</p>
                <ul className="mt-2 space-y-2 text-[12px] text-warning-ink">
                  {invalidRows.map((row) => (
                    <li key={row.rowNumber}>
                      <span className="font-semibold">Fila {row.rowNumber}:</span>{" "}
                      {row.errors.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {validRows.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-line p-3">
                <p className="text-[12px] font-semibold text-muted">Vista previa (válidas)</p>
                <ul className="mt-2 space-y-1 text-[13px] text-ink">
                  {validRows.slice(0, 8).map((row) => (
                    <li key={row.rowNumber}>
                      Fila {row.rowNumber}: {row.input?.commercialName} — {row.input?.brand}{" "}
                      {row.input?.model}
                    </li>
                  ))}
                  {validRows.length > 8 ? (
                    <li className="text-muted">… y {validRows.length - 8} más</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {parseError ? (
              <p className="flex items-start gap-2 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {parseError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={reset}>
                Elegir otro archivo
              </Button>
              <Button
                type="button"
                disabled={validRows.length === 0 || bulkImport.isPending}
                onClick={() => void handleConfirm()}
              >
                {bulkImport.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Importar {validRows.length} equipo{validRows.length === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && result ? (
          <div className="mt-5 space-y-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-[13px] text-success-ink">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  {result.created.length} equipo{result.created.length === 1 ? "" : "s"} creado
                  {result.created.length === 1 ? "" : "s"} correctamente
                </p>
                {result.failed.length > 0 ? (
                  <p className="mt-1">
                    {result.failed.length} fila{result.failed.length === 1 ? "" : "s"} no se pudo
                    {result.failed.length === 1 ? "" : "ieron"} importar
                  </p>
                ) : null}
              </div>
            </div>

            {result.failed.length > 0 ? (
              <div className="max-h-40 overflow-y-auto rounded-xl border border-danger/20 bg-danger-soft/40 p-3">
                <p className="text-[12px] font-semibold text-danger-ink">Fallos al guardar</p>
                <ul className="mt-2 space-y-1 text-[12px] text-danger-ink">
                  {result.failed.map((row) => (
                    <li key={row.rowNumber}>
                      Fila {row.rowNumber}: {row.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="button" onClick={handleClose}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}

        {step !== "result" ? (
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
