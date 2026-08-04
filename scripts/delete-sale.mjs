// Elimina una o varias ventas y todos sus registros asociados del Google Sheet.
// Uso: node scripts/delete-sale.mjs <SALE_ID> [SALE_ID...]
import { loadEnv, getSheets } from "./lib/google.mjs";

const saleIds = process.argv.slice(2);
if (saleIds.length === 0) {
  console.error("Uso: node scripts/delete-sale.mjs <SALE_ID> [SALE_ID...]");
  process.exit(1);
}

const cfg = loadEnv();
const sheets = getSheets(cfg);
const spreadsheetId = cfg.sheetId;
const targetSet = new Set(saleIds);

// tab -> función que decide si una fila (registro por header) pertenece a alguna venta objetivo.
const TARGETS = [
  { tab: "Ventas", match: (r) => targetSet.has(r.id) },
  { tab: "LineasVenta", match: (r) => targetSet.has(r.ventaId) },
  { tab: "Comisiones", match: (r) => targetSet.has(r.ventaId) },
  { tab: "Logs", match: (r) => saleIds.some((id) => (r.contexto ?? "").includes(id)) },
];

for (const { tab, match } of TARGETS) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: tab });
  const values = res.data.values ?? [];
  if (values.length < 2) {
    console.log(`${tab}: sin datos, nada que borrar.`);
    continue;
  }
  const [headers, ...rows] = values;
  const kept = rows.filter((row) => {
    const record = {};
    headers.forEach((h, i) => (record[String(h)] = row[i] != null ? String(row[i]) : ""));
    return !match(record);
  });
  const removed = rows.length - kept.length;
  if (removed === 0) {
    console.log(`${tab}: 0 filas coinciden.`);
    continue;
  }
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: tab });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers, ...kept] },
  });
  console.log(`${tab}: ${removed} fila(s) eliminada(s).`);
}

console.log(`\n✅ Venta(s) eliminada(s) del Sheet: ${saleIds.join(", ")}.`);
