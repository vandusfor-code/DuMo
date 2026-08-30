import { normalizePhoneForLookup } from "@/lib/verificador/normalize-phone";
import { lookupCompany, loadSubtelIndex, type SubtelIndex } from "@/lib/verificador/subtel-index";
import type { ParsedCsvRow } from "@/lib/verificador/parse-csv";

export type ProcessedRow = {
  numero: string;
  compania: string;
  status: "done" | "empty" | "invalid";
};

export type ProcessProgress = {
  processed: number;
  total: number;
  current?: ProcessedRow;
  rows: ProcessedRow[];
};

const BATCH_SIZE = 25;

export async function* processNumbersStream(
  inputRows: ParsedCsvRow[],
): AsyncGenerator<ProcessProgress> {
  const index = await loadSubtelIndex();
  const cache = new Map<string, string>();
  const results: ProcessedRow[] = [];
  const total = inputRows.length;

  for (let i = 0; i < inputRows.length; i++) {
    const input = inputRows[i];
    const original = input.original;
    const trimmed = input.numero.trim();

    let row: ProcessedRow;
    if (!trimmed) {
      row = { numero: original, compania: "", status: "empty" };
    } else {
      const normalized = normalizePhoneForLookup(trimmed);
      if (!normalized) {
        row = { numero: original, compania: "", status: "invalid" };
      } else {
        let compania = cache.get(normalized);
        if (compania === undefined) {
          compania = lookupCompany(index, trimmed);
          cache.set(normalized, compania);
        }
        row = { numero: original, compania, status: "done" };
      }
    }

    results.push(row);

    const shouldYield =
      (i + 1) % BATCH_SIZE === 0 || i === inputRows.length - 1 || i < 8;
    if (shouldYield) {
      yield {
        processed: i + 1,
        total,
        current: row,
        rows: [...results],
      };
      await new Promise((r) => setTimeout(r, 0));
    }
  }
}

/** Procesamiento síncrono para pruebas. */
export function processNumbersSync(
  index: SubtelIndex,
  inputRows: ParsedCsvRow[],
): ProcessedRow[] {
  const cache = new Map<string, string>();
  return inputRows.map((input) => {
    const trimmed = input.numero.trim();
    if (!trimmed) return { numero: input.original, compania: "", status: "empty" as const };
    const normalized = normalizePhoneForLookup(trimmed);
    if (!normalized) return { numero: input.original, compania: "", status: "invalid" as const };
    let compania = cache.get(normalized);
    if (compania === undefined) {
      compania = lookupCompany(index, trimmed);
      cache.set(normalized, compania);
    }
    return { numero: input.original, compania, status: "done" as const };
  });
}
