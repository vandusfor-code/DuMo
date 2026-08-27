import * as XLSX from "xlsx";
import { normalizeWhatsAppPhoneDigits, isLikelyWhatsAppLid } from "@/lib/whatsapp/phone";
import type { CampaignColumnField, CampaignColumnMapping } from "@/types/campaign";

export interface ParsedCampaignWorkbook {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCampaignWorkbook(buffer: ArrayBuffer): ParsedCampaignWorkbook {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = raw.length > 0 ? Object.keys(raw[0]!) : [];
  const rows = raw.map((row) => {
    const out: Record<string, string> = {};
    for (const h of headers) out[h] = String(row[h] ?? "").trim();
    return out;
  });
  return { headers, rows };
}

const NAME_VARIANTS = ["nombre", "nombres", "cliente", "nombre cliente", "name", "customer"];
const PHONE_VARIANTS = ["telefono", "teléfono", "celular", "numero", "número", "phone", "cel", "movil", "móvil"];
const RUT_VARIANTS = ["rut", "cedula", "cédula", "dni"];
const COMPANY_VARIANTS = ["compania", "compañía", "operador", "empresa", "carrier"];

// Las listas de variantes ya incluyen ambas formas (con y sin tilde), así que
// alcanza con normalizar mayúsculas/espacios — no hace falta despojar acentos.
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

/** Sugerencia de mapeo por variantes razonables — el usuario siempre confirma/corrige (nunca se asume). */
export function detectColumnMapping(headers: string[]): CampaignColumnMapping {
  const mapping: CampaignColumnMapping = {};
  const used = new Set<CampaignColumnField>();

  const tryMatch = (header: string, variants: string[], field: CampaignColumnField) => {
    if (used.has(field)) return false;
    const normalized = normalizeHeader(header);
    if (variants.some((v) => normalizeHeader(v) === normalized)) {
      mapping[header] = field;
      used.add(field);
      return true;
    }
    return false;
  };

  for (const header of headers) {
    if (tryMatch(header, PHONE_VARIANTS, "phone")) continue;
    if (tryMatch(header, NAME_VARIANTS, "name")) continue;
    if (tryMatch(header, RUT_VARIANTS, "rut")) continue;
    if (tryMatch(header, COMPANY_VARIANTS, "company")) continue;
    mapping[header] = null;
  }
  return mapping;
}

const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 14;

export function isValidCampaignPhone(digits: string): boolean {
  if (!digits) return false;
  if (isLikelyWhatsAppLid(digits)) return false;
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
}

export interface ClassifiedContact {
  /** Payload normalizado a nombres fijos (nombre/telefono/rut/compania) — así {{nombre}}
   * en el mensaje siempre calza sin importar cómo se llamaba la columna original. */
  rawPayload: Record<string, string>;
  name: string;
  phone: string;
  phoneRaw: string;
  status: "PENDING" | "INVALID" | "DUPLICATE" | "EXCLUDED" | "OPTED_OUT";
  error?: string;
}

/** Nombre de variable fijo que ofrece el constructor de mensajes para cada campo mapeado. */
export const FIELD_VARIABLE_NAMES: Record<Exclude<CampaignColumnField, null>, string> = {
  name: "nombre",
  phone: "telefono",
  rut: "rut",
  company: "compania",
};

function buildNormalizedPayload(row: Record<string, string>, mapping: CampaignColumnMapping): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    if (!field) continue;
    normalized[FIELD_VARIABLE_NAMES[field]] = row[header] ?? "";
  }
  return normalized;
}

/**
 * Clasifica cada fila (sección 10): teléfono vacío/inválido → INVALID,
 * repetido dentro del archivo → DUPLICATE, en la suppression list →
 * EXCLUDED/OPTED_OUT según la fuente, elegible → PENDING. NO borra filas —
 * todas quedan, solo cambia su estado.
 */
export function classifyContacts(
  rows: Record<string, string>[],
  mapping: CampaignColumnMapping,
  isSuppressed: (phone: string) => { suppressed: boolean; isOptOut: boolean },
): ClassifiedContact[] {
  const phoneHeader = Object.entries(mapping).find(([, field]) => field === "phone")?.[0];
  const nameHeader = Object.entries(mapping).find(([, field]) => field === "name")?.[0];

  const seenPhones = new Set<string>();
  const results: ClassifiedContact[] = [];

  for (const row of rows) {
    const phoneRaw = phoneHeader ? row[phoneHeader] ?? "" : "";
    const name = nameHeader ? row[nameHeader] ?? "" : "";
    const digits = normalizeWhatsAppPhoneDigits(phoneRaw);
    const rawPayload = buildNormalizedPayload(row, mapping);

    if (!isValidCampaignPhone(digits)) {
      results.push({ rawPayload, name, phone: digits, phoneRaw, status: "INVALID", error: "Teléfono vacío o inválido." });
      continue;
    }
    if (seenPhones.has(digits)) {
      results.push({ rawPayload, name, phone: digits, phoneRaw, status: "DUPLICATE", error: "Duplicado dentro del archivo." });
      continue;
    }
    seenPhones.add(digits);

    const suppression = isSuppressed(digits);
    if (suppression.suppressed) {
      results.push({
        rawPayload,
        name,
        phone: digits,
        phoneRaw,
        status: suppression.isOptOut ? "OPTED_OUT" : "EXCLUDED",
        error: suppression.isOptOut ? "Contacto dado de baja (opt-out)." : "Contacto en lista de exclusión.",
      });
      continue;
    }

    results.push({ rawPayload, name, phone: digits, phoneRaw, status: "PENDING" });
  }

  return results;
}
