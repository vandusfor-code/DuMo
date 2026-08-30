import { MAX_NUMBERS } from "@/lib/verificador/config";
import type { ParsedCsv } from "@/lib/verificador/parse-csv";

export type CsvValidationResult =
  | { ok: true; emptyRows: number; totalRows: number }
  | { ok: false; error: string };

export function validateParsedCsv(parsed: ParsedCsv): CsvValidationResult {
  if (parsed.headers.length === 0) {
    return { ok: false, error: "No pudimos leer el archivo CSV." };
  }

  const hasNumero = parsed.headers.some((h) => h.toLowerCase() === "numero");
  if (!hasNumero) {
    return { ok: false, error: 'El archivo debe contener una columna llamada "numero".' };
  }

  if (parsed.rows.length === 0) {
    return { ok: false, error: "El archivo no contiene registros." };
  }

  if (parsed.rows.length > MAX_NUMBERS) {
    return { ok: false, error: "El archivo supera el límite de 1.000 números." };
  }

  const emptyRows = parsed.rows.filter((r) => !r.numero.trim()).length;
  return { ok: true, emptyRows, totalRows: parsed.rows.length };
}
