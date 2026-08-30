import type { ProcessedRow } from "@/lib/verificador/process-numbers";

function escapeCsvField(value: string): string {
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/** Genera CSV de salida: solo numero,compania (UTF-8). */
export function generateResultCsv(rows: ProcessedRow[]): string {
  const lines = ["numero,compania"];
  for (const row of rows) {
    lines.push(`${escapeCsvField(row.numero)},${escapeCsvField(row.compania)}`);
  }
  return lines.join("\r\n");
}

export function downloadResultCsv(rows: ProcessedRow[], filename: string): void {
  const csv = generateResultCsv(rows);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
