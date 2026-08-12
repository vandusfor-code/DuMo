import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import type { PcsValidationNumero } from "@/types/pcs-validation";

export const PCS_VALIDATION_TEMPLATE_SHEET = "Numeros";
export const PCS_VALIDATION_MAX_RECOMMENDED = 1000;

export type PcsValidationInputRow = { pcs: string; nombre: string };

export interface NormalizedPcsRow {
  /** Dígitos normalizados — lo que se consulta en el bridge (vacío si inválido). */
  digits: string;
  /** Valor original tal como venía en el Excel, para mostrar en la tabla. */
  pcsOriginal: string;
  nombre: string | null;
  valido: boolean;
}

/** Mismo criterio de "indicativo de país válido" que el resto de DuMo usa para teléfonos reales. */
export function isValidCountryCodeLength(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 14;
}

/**
 * Normaliza, descarta filas con PCS vacío (no cuentan en el total) y
 * de-duplica por número — se valida una sola vez, una fila en el resultado.
 * Usado tanto en el preview del cliente como en el backend, para que ambos
 * lados de la validación calcen exactamente.
 */
export function normalizeAndDedupePcsRows(rows: PcsValidationInputRow[]): NormalizedPcsRow[] {
  const seen = new Set<string>();
  const result: NormalizedPcsRow[] = [];

  for (const row of rows) {
    const pcsOriginal = (row.pcs ?? "").trim();
    if (!pcsOriginal) continue;

    const digits = normalizeWhatsAppPhoneDigits(pcsOriginal);
    const dedupeKey = digits || pcsOriginal;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const nombre = (row.nombre ?? "").trim() || null;
    result.push({
      digits,
      pcsOriginal,
      nombre,
      valido: isValidCountryCodeLength(digits),
    });
  }

  return result;
}

export function toPcsValidationNumeros(rows: NormalizedPcsRow[]): PcsValidationNumero[] {
  return rows.map((r) => ({ pcs: r.digits, nombre: r.nombre }));
}
