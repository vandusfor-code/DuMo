"use client";

import { useCallback, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Lock,
  Play,
  Search,
  Square,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  MAX_NUMBERS,
  PLANTILLA_PATH,
  RESULT_FILENAME,
} from "@/lib/verificador/config";
import { downloadResultCsv } from "@/lib/verificador/generate-csv";
import { normalizePhoneForLookup } from "@/lib/verificador/normalize-phone";
import { parseCsv, type ParsedCsvRow } from "@/lib/verificador/parse-csv";
import {
  processNumbersStream,
  type ProcessedRow,
} from "@/lib/verificador/process-numbers";
import { lookupSubtelCompany } from "@/lib/verificador/subtel-index";
import { validateParsedCsv } from "@/lib/verificador/validate-csv";

type UiState = "idle" | "loaded" | "validating" | "processing" | "done" | "error";

type LoadedFile = {
  name: string;
  rows: ParsedCsvRow[];
  emptyRows: number;
};

type ManualResult =
  | { kind: "found"; numero: string; compania: string }
  | { kind: "not_found"; numero: string }
  | { kind: "invalid" };

function isValidManualInput(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 12) return false;
  return normalizePhoneForLookup(raw) !== null;
}

const cardClassName =
  "rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export function VerificadorApp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const [uiState, setUiState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<LoadedFile | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [liveRows, setLiveRows] = useState<ProcessedRow[]>([]);
  const [results, setResults] = useState<ProcessedRow[]>([]);

  const [manualInput, setManualInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResult, setManualResult] = useState<ManualResult | null>(null);

  const resetResults = () => {
    setResults([]);
    setLiveRows([]);
    setProgress({ processed: 0, total: 0 });
    abortRef.current = false;
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setWarning(null);
    resetResults();
    setUiState("validating");

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      const validation = validateParsedCsv(parsed);
      if (!validation.ok) {
        setError(validation.error);
        setLoaded(null);
        setUiState("error");
        return;
      }

      if (validation.emptyRows > 0) {
        setWarning(
          `El archivo contiene ${validation.emptyRows} registro(s) vacío(s). Se procesarán los números válidos.`,
        );
      }

      setLoaded({
        name: file.name,
        rows: parsed.rows,
        emptyRows: validation.emptyRows,
      });
      setUiState("loaded");
    } catch {
      setError("No pudimos leer el archivo CSV.");
      setLoaded(null);
      setUiState("error");
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const removeFile = () => {
    setLoaded(null);
    setError(null);
    setWarning(null);
    resetResults();
    setUiState("idle");
  };

  const stopProcessing = () => {
    abortRef.current = true;
  };

  const finalizeProcessing = async () => {
    if (!loaded) return;
    setError(null);
    resetResults();
    setUiState("processing");
    setProgress({ processed: 0, total: loaded.rows.length });
    const finalRows: ProcessedRow[] = [];

    try {
      for await (const step of processNumbersStream(loaded.rows)) {
        if (abortRef.current) {
          setUiState("loaded");
          return;
        }
        setProgress({ processed: step.processed, total: step.total });
        setLiveRows(step.rows);
        finalRows.length = 0;
        finalRows.push(...step.rows);
      }
      setResults(finalRows);
      setUiState("done");
    } catch {
      setError("Ocurrió un error al procesar los números.");
      setUiState("error");
    }
  };

  const runManualSearch = async () => {
    const value = manualInput.trim();
    setManualResult(null);
    if (!value) return;

    if (!isValidManualInput(value)) {
      setManualResult({ kind: "invalid" });
      return;
    }

    setManualLoading(true);
    try {
      const compania = await lookupSubtelCompany(value);
      if (compania) {
        setManualResult({ kind: "found", numero: value, compania });
      } else {
        setManualResult({ kind: "not_found", numero: value });
      }
    } catch {
      setError("No se pudo consultar la base SUBTEL.");
    } finally {
      setManualLoading(false);
    }
  };

  const pct =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;

  const foundCount = results.filter((r) => r.compania).length;
  const notFoundCount = results.filter(
    (r) => r.status === "done" && r.numero.trim() && !r.compania,
  ).length;

  type LiveItem = {
    numero: string;
    compania: string;
    state: "done" | "consulting" | "pending";
    status?: ProcessedRow["status"];
  };

  const liveItems: LiveItem[] = (() => {
    if (!loaded || (uiState !== "processing" && uiState !== "done")) return [];
    const windowSize = 8;
    const anchor = Math.max(0, progress.processed - 3);
    const end = Math.min(loaded.rows.length, anchor + windowSize);
    const items: LiveItem[] = [];

    for (let i = anchor; i < end; i++) {
      const source = loaded.rows[i];
      const done = liveRows[i];
      if (done) {
        items.push({
          numero: done.numero,
          compania: done.compania,
          state: "done",
          status: done.status,
        });
      } else if (i === progress.processed && uiState === "processing") {
        items.push({
          numero: source.original || source.numero,
          compania: "",
          state: "consulting",
        });
      } else {
        items.push({
          numero: source.original || source.numero,
          compania: "",
          state: "pending",
        });
      }
    }
    return items;
  })();

  return (
    <main className="mx-auto w-full max-w-[1720px] px-5 py-3 sm:px-8 lg:px-12">
      <section className="mb-3">
        <h1 className="text-[22px] font-bold tracking-tight text-[#0f172a] sm:text-2xl">
          Verificador de Numeración
        </h1>
        <p className="mt-1 text-[13px] leading-snug text-[#64748b] sm:text-sm">
          Consulta números de Chile utilizando la base oficial de numeración de SUBTEL.
        </p>
      </section>

      <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[12px] leading-snug text-[#1e40af] sm:text-[13px]">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p>
          La información corresponde al operador asignatario según SUBTEL y no necesariamente
          al operador actual del número.
        </p>
      </div>

      <section className={`mb-3 ${cardClassName}`}>
        <h2 className="mb-2.5 text-[13px] font-semibold text-[#0f172a] sm:text-sm">
          Buscar número manualmente
        </h2>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            void runManualSearch();
          }}
        >
          <label className="sr-only" htmlFor="manual-number">
            Número telefónico
          </label>
          <input
            id="manual-number"
            type="text"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej: 912345678"
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value);
              setManualResult(null);
            }}
            className="h-10 w-full flex-1 rounded-lg border border-[#cbd5e1] bg-white px-3 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
          />
          <button
            type="submit"
            disabled={manualLoading || !manualInput.trim()}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-5 text-[13px] font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] sm:min-w-[120px]"
          >
            {manualLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Consultando...
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden />
                Consultar
              </>
            )}
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-[#94a3b8] sm:text-xs">
          Ingresa 9 a 12 dígitos, con o sin +56
        </p>

        {manualResult?.kind === "invalid" && (
          <p className="mt-2 text-xs text-[#b45309]" role="alert">
            Ingresa un número válido de Chile (9 a 12 dígitos, con o sin +56).
          </p>
        )}

        {manualResult?.kind === "not_found" && (
          <p className="mt-2 text-xs text-[#64748b]" role="status">
            No encontramos una compañía para este número en la base de SUBTEL.
          </p>
        )}

        {manualResult?.kind === "found" && (
          <div className="mt-2.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-3">
            <p className="mb-2 text-xs font-semibold text-[#0f172a]">Resultado</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                  Número
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {manualResult.numero}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                  Compañía
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#0f172a]">
                  {manualResult.compania}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#b91c1c]"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      )}

      {warning && uiState !== "error" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#92400e]">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>{warning}</p>
        </div>
      )}

      <section className={`mb-3 ${cardClassName}`}>
        <h2 className="mb-3 text-[13px] font-semibold text-[#0f172a] sm:text-sm">
          1. Cargar archivo CSV
        </h2>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_220px] xl:grid-cols-[minmax(0,1fr)_220px_240px]">
          <div className="space-y-2.5">
            {!loaded ? (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex min-h-[128px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-5 text-center transition ${
                  dragOver
                    ? "border-[#2563eb] bg-[#eff6ff]"
                    : "border-[#cbd5e1] bg-[#fafbfd] hover:border-[#93c5fd] hover:bg-[#f8fbff]"
                }`}
              >
                <UploadCloud className="mb-2 size-8 text-[#2563eb]" aria-hidden />
                <p className="text-sm font-medium text-[#0f172a]">
                  Arrastra tu archivo CSV aquí
                </p>
                <p className="mt-0.5 text-xs text-[#64748b]">o haz clic para seleccionar</p>
                <p className="mt-2 text-[11px] text-[#94a3b8]">
                  Formato: CSV · Máximo {MAX_NUMBERS.toLocaleString("es-CL")} números
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={onInputChange}
                  aria-label="Seleccionar archivo CSV"
                />
              </div>
            ) : (
              <div className="flex min-h-[128px] items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#fafbfd] px-4 py-4 lg:hidden">
                <p className="text-xs text-[#64748b]">Archivo cargado. Revisa el panel central.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                href={PLANTILLA_PATH}
                download="plantilla_verificador_numeracion_dumo.csv"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563eb] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
              >
                <Download className="size-3.5" aria-hidden />
                Descargar plantilla CSV
              </a>
              <button
                type="button"
                disabled={!loaded || uiState === "processing"}
                onClick={() => void finalizeProcessing()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
              >
                {uiState === "processing" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-4" aria-hidden />
                )}
                Procesar números
              </button>
              <p className="inline-flex items-center gap-1.5 text-[11px] text-[#64748b]">
                <Lock className="size-3" aria-hidden />
                Tus datos están protegidos y no se almacenan.
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            {loaded ? (
              <div className="flex h-full min-h-[128px] flex-col justify-center rounded-lg border border-[#e2e8f0] bg-[#fafbfd] px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid size-8 shrink-0 place-items-center rounded-md bg-[#ecfdf3] text-[#059669]">
                      <FileSpreadsheet className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-[#0f172a]">{loaded.name}</p>
                      <p className="text-[11px] text-[#64748b]">
                        {loaded.rows.length.toLocaleString("es-CL")} registros
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#dc2626] transition hover:bg-[#fef2f2]"
                  >
                    <Trash2 className="size-3" aria-hidden />
                    Eliminar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[128px] items-center justify-center rounded-lg border border-dashed border-[#e2e8f0] bg-[#fafbfd] px-3 text-center text-xs text-[#94a3b8]">
                Sin archivo cargado
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-[#dbeafe] bg-[#f8fbff] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0f172a]">
              <Info className="size-3.5 text-[#2563eb]" aria-hidden />
              Formato esperado
            </p>
            <p className="mb-2 text-[11px] leading-snug text-[#64748b]">
              El CSV debe incluir una columna llamada{" "}
              <code className="rounded bg-white px-1">numero</code>.
            </p>
            <div className="overflow-hidden rounded-md border border-[#e2e8f0] bg-white text-xs">
              <div className="border-b border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1.5 font-medium">
                numero
              </div>
              {["912345678", "987654321", "912111222"].map((n) => (
                <div
                  key={n}
                  className="border-b border-[#f1f5f9] px-2.5 py-1.5 text-[#475569] last:border-0"
                >
                  {n}
                </div>
              ))}
            </div>
          </aside>
        </div>

        {loaded && (
          <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-[#fafbfd] px-3 py-2.5 lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid size-8 place-items-center rounded-md bg-[#ecfdf3] text-[#059669]">
                <FileSpreadsheet className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#0f172a]">{loaded.name}</p>
                <p className="text-xs text-[#64748b]">
                  {loaded.rows.length.toLocaleString("es-CL")} registros
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-[#dc2626] hover:bg-[#fef2f2]"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Eliminar
            </button>
          </div>
        )}
      </section>

      {(uiState === "processing" || uiState === "done") && (
        <section className={`mb-3 ${cardClassName}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[13px] font-semibold text-[#0f172a] sm:text-sm">
              2. Procesando números
            </h2>
            {uiState === "processing" && (
              <button
                type="button"
                onClick={stopProcessing}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:bg-[#f8fafc]"
              >
                <Square className="size-3" aria-hidden />
                Detener proceso
              </button>
            )}
          </div>

          <div className="mb-1 flex items-center justify-between text-xs text-[#64748b]">
            <span>
              {uiState === "processing" ? "Procesando..." : "Consulta completada"} ·{" "}
              {progress.processed} de {progress.total}
            </span>
            <span>{pct}%</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          {uiState === "processing" && (
            <ul className="space-y-1.5 text-xs" aria-live="polite">
            {liveItems.map((item, idx) => (
              <li key={`${item.numero}-${idx}`} className="flex items-center gap-2 text-[#334155]">
                {item.state === "done" ? (
                  <CheckCircle2 className="size-3.5 shrink-0 text-[#16a34a]" aria-hidden />
                ) : item.state === "consulting" ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[#2563eb]" aria-hidden />
                ) : (
                  <Circle className="size-3.5 shrink-0 text-[#cbd5e1]" aria-hidden />
                )}
                <span className="min-w-[110px] font-medium">{item.numero || "—"}</span>
                <span className="truncate text-[#64748b]">
                  {item.state === "consulting"
                    ? "Consultando..."
                    : item.state === "pending"
                      ? "Pendiente"
                      : item.compania ||
                        (item.status === "empty"
                          ? "Vacío"
                          : item.status === "invalid"
                            ? "Formato no válido"
                            : "—")}
                </span>
              </li>
            ))}
            </ul>
          )}
        </section>
      )}

      {uiState === "done" && results.length > 0 && (
        <section className={cardClassName}>
          <div className="mb-3">
            <h2 className="text-[13px] font-semibold text-[#0f172a] sm:text-sm">3. Resultados</h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Consulta completada · {results.length.toLocaleString("es-CL")} números procesados
            </p>
          </div>

          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                Total números
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#0f172a]">{results.length}</p>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                Encontrados
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#16a34a]">{foundCount}</p>
            </div>
            <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#94a3b8]">
                No encontrados
              </p>
              <p className="mt-0.5 text-lg font-bold text-[#dc2626]">{notFoundCount}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e2e8f0]">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-[#475569]">
                <tr>
                  <th className="px-3 py-2 font-semibold">Número</th>
                  <th className="px-3 py-2 font-semibold">Compañía</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={`${row.numero}-${i}`} className="border-t border-[#f1f5f9]">
                    <td className="px-3 py-2 font-medium text-[#0f172a]">{row.numero}</td>
                    <td className="px-3 py-2 text-[#334155]">{row.compania}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-start gap-1.5 text-[11px] text-[#64748b]">
              <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
              El archivo descargado contiene únicamente las columnas{" "}
              <code className="rounded bg-[#f8fafc] px-1">numero</code> y{" "}
              <code className="rounded bg-[#f8fafc] px-1">compania</code>.
            </p>
            <button
              type="button"
              onClick={() => downloadResultCsv(results, RESULT_FILENAME)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#2563eb] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1d4ed8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
            >
              <Download className="size-4" aria-hidden />
              Descargar CSV procesado
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
