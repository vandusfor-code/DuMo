import { SUBTEL_INDEX_PATH } from "@/lib/verificador/config";
import { normalizePhoneForLookup } from "@/lib/verificador/normalize-phone";

export type SubtelIndex = {
  version: number;
  companies: string[];
  ranges: [number, number, number][];
};

let cachedIndex: SubtelIndex | null = null;

export async function loadSubtelIndex(): Promise<SubtelIndex> {
  if (cachedIndex) return cachedIndex;
  const res = await fetch(SUBTEL_INDEX_PATH);
  if (!res.ok) throw new Error("No se pudo cargar la base SUBTEL.");
  cachedIndex = (await res.json()) as SubtelIndex;
  return cachedIndex;
}

export function lookupCompany(index: SubtelIndex, rawNumber: string): string {
  const normalized = normalizePhoneForLookup(rawNumber);
  if (!normalized) return "";
  const num = Number(normalized);
  if (!Number.isFinite(num)) return "";

  const { ranges, companies } = index;
  let lo = 0;
  let hi = ranges.length - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end, companyIdx] = ranges[mid];
    if (num < start) hi = mid - 1;
    else if (num > end) lo = mid + 1;
    else return companies[companyIdx] ?? "";
  }
  return "";
}

/** Consulta única reutilizando el índice SUBTEL en memoria. */
export async function lookupSubtelCompany(rawNumber: string): Promise<string> {
  const index = await loadSubtelIndex();
  return lookupCompany(index, rawNumber);
}
