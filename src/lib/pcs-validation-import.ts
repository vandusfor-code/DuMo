import * as XLSX from "xlsx";
import { PCS_VALIDATION_TEMPLATE_SHEET, type PcsValidationInputRow } from "@/lib/pcs-validation";

export const PCS_FORMAT_ERROR =
  "El archivo no tiene el formato esperado (hoja 'Numeros', columnas PCS y Nombre).";

function cellValue(cell: unknown): string {
  if (cell == null) return "";
  return String(cell).trim();
}

/** Lee la hoja "Numeros" (columna A = PCS, columna B = Nombre, encabezados en fila 1). */
export function parsePcsWorkbook(buffer: ArrayBuffer): PcsValidationInputRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === PCS_VALIDATION_TEMPLATE_SHEET.toLowerCase(),
  );
  if (!sheetName) throw new Error(PCS_FORMAT_ERROR);

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (rows.length === 0) throw new Error(PCS_FORMAT_ERROR);

  const header = (rows[0] as unknown[]).map((c) => cellValue(c).toLowerCase());
  if (header[0] !== "pcs") throw new Error(PCS_FORMAT_ERROR);

  const result: PcsValidationInputRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!Array.isArray(row)) continue;
    result.push({ pcs: cellValue(row[0]), nombre: cellValue(row[1]) });
  }
  return result;
}
