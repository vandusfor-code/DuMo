import * as XLSX from "xlsx";
import { validateEquipmentCatalogInput } from "@/lib/equipment-catalog";
import type { EquipmentBulkImportResult, EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";

export const EQUIPMENT_TEMPLATE_PATH = "/templates/plantilla-equipos-crm.xlsx";

export type EquipmentImportPreviewRow = {
  rowNumber: number;
  input: UpsertEquipmentInput | null;
  errors: string[];
};

export type { EquipmentBulkImportResult };

function cellValue(cell: unknown): string {
  if (cell == null) return "";
  return String(cell).trim();
}

function parseNumber(value: unknown, label: string): { value: number | null; error?: string } {
  if (value == null || value === "") return { value: null, error: `${label} es obligatorio.` };
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return { value: null, error: `${label} inválido.` };
  return { value: n };
}

function parseInteger(value: unknown, label: string): { value: number | null; error?: string } {
  const parsed = parseNumber(value, label);
  if (parsed.error || parsed.value == null) return parsed;
  if (!Number.isInteger(parsed.value)) return { value: null, error: `${label} debe ser un número entero.` };
  return parsed;
}

function parsePieCero(value: unknown): { value: boolean | null; error?: string } {
  const raw = cellValue(value).toUpperCase();
  if (!raw) return { value: false };
  if (raw === "SI" || raw === "SÍ") return { value: true };
  if (raw === "NO") return { value: false };
  return { value: null, error: 'Pie Cero debe ser "SI" o "NO".' };
}

function parseStatus(value: unknown): { value: EquipmentStatus | null; error?: string } {
  const raw = cellValue(value).toLowerCase();
  if (!raw) return { value: null, error: "Estado es obligatorio." };
  if (raw === "activo") return { value: "active" };
  if (raw === "inactivo") return { value: "inactive" };
  return { value: null, error: 'Estado debe ser "Activo" o "Inactivo".' };
}

/** Maps one Excel row (columns A–N) to UpsertEquipmentInput. Row 1 = headers. */
export function mapEquipmentImportRow(
  row: unknown[],
  rowNumber: number,
): EquipmentImportPreviewRow {
  const errors: string[] = [];

  const commercialName = cellValue(row[0]);
  const brand = cellValue(row[1]);
  const model = cellValue(row[2]);

  const total = parseNumber(row[3], "Valor total");
  if (total.error) errors.push(total.error);

  const down = parseNumber(row[4], "Valor del pie");
  if (down.error) errors.push(down.error);

  const pieCero = parsePieCero(row[5]);
  if (pieCero.error) errors.push(pieCero.error);

  const installments = parseInteger(row[6], "Cantidad de cuotas");
  if (installments.error) errors.push(installments.error);

  const installmentValue = parseNumber(row[7], "Valor de cada cuota");
  if (installmentValue.error) errors.push(installmentValue.error);

  const commercialText = cellValue(row[8]);
  const color = cellValue(row[9]);
  const memory = cellValue(row[10]);
  const promotions = cellValue(row[11]);
  const observations = cellValue(row[12]);

  const status = parseStatus(row[13]);
  if (status.error) errors.push(status.error);

  const input: UpsertEquipmentInput = {
    commercialName,
    brand,
    model,
    totalValue: total.value ?? 0,
    downPayment: down.value ?? 0,
    isPieCero: pieCero.value ?? false,
    installmentsCount: installments.value ?? 0,
    installmentValue: installmentValue.value ?? 0,
    commercialText,
    color,
    memory,
    promotions,
    observations,
    status: status.value ?? "active",
  };

  const catalogError = validateEquipmentCatalogInput(input);
  if (catalogError) errors.push(catalogError);

  const isEmptyRow =
    !commercialName &&
    !brand &&
    !model &&
    row.slice(3).every((c) => c == null || cellValue(c) === "");

  if (isEmptyRow) {
    return { rowNumber, input: null, errors: [] };
  }

  return {
    rowNumber,
    input: errors.length === 0 ? input : null,
    errors,
  };
}

export function parseEquipmentWorkbook(buffer: ArrayBuffer): EquipmentImportPreviewRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const results: EquipmentImportPreviewRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!Array.isArray(row)) continue;
    const mapped = mapEquipmentImportRow(row, i + 1);
    if (mapped.errors.length === 0 && !mapped.input) continue;
    if (mapped.input || mapped.errors.length > 0) results.push(mapped);
  }

  return results;
}
