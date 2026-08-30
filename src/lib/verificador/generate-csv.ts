import type { ProcessedRow } from "@/lib/verificador/process-numbers";

/** Separador compatible con Excel en locale es-CL (Windows usa punto y coma). */
const CSV_DELIMITER = ";";

function escapeCsvField(value: string): string {
  const needsQuote = new RegExp(`["${CSV_DELIMITER}\\n\\r]`).test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/** Genera CSV de salida: numero y compania en columnas separadas (UTF-8). */
export function generateResultCsv(rows: ProcessedRow[]): string {
  const lines = [`sep=${CSV_DELIMITER}`, `numero${CSV_DELIMITER}compania`];
  for (const row of rows) {
    lines.push(
      `${escapeCsvField(row.numero)}${CSV_DELIMITER}${escapeCsvField(row.compania)}`,
    );
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
