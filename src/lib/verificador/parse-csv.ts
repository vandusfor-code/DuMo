export type ParsedCsvRow = {
  original: string;
  numero: string;
  rowIndex: number;
};

export type ParsedCsv = {
  headers: string[];
  rows: ParsedCsvRow[];
};

/** Parser CSV mínimo (UTF-8, comillas, comas). */
export function parseCsv(text: string): ParsedCsv {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else if (ch === "\r") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  while (rows.length > 0 && rows[rows.length - 1].every((c) => !c.trim())) {
    rows.pop();
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const dataRows: ParsedCsvRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const numeroIdx = headers.findIndex((h) => h.toLowerCase() === "numero");
    const numero = numeroIdx >= 0 ? (cells[numeroIdx] ?? "").trim() : "";
    dataRows.push({
      original: numeroIdx >= 0 ? (cells[numeroIdx] ?? "") : "",
      numero,
      rowIndex: i,
    });
  }

  return { headers, rows: dataRows };
}
