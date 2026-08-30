/**
 * Pruebas obligatorias del verificador de numeración.
 * Ejecutar: node scripts/test-verificador.mjs
 */
import { readFileSync } from "node:fs";

const index = JSON.parse(readFileSync("public/verificador/subtel-index.json", "utf8"));

function normalizePhoneForLookup(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  const originalLength = digits.length;
  if (digits.startsWith("56") && digits.length >= 10) digits = digits.slice(2);
  if (digits.length === 9) return digits;
  if (originalLength === 10 && digits.length === 8 && digits.startsWith("9")) {
    return `${digits}0`;
  }
  if (digits.length === 8 && /^[2-8]/.test(digits)) return `9${digits}`;
  return null;
}

function parseCsv(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    const next = normalized[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
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
    } else field += ch;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows[0]?.map((h) => h.trim()) ?? [];
  const dataRows = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const numeroIdx = headers.findIndex((h) => h.toLowerCase() === "numero");
    dataRows.push({
      original: numeroIdx >= 0 ? (cells[numeroIdx] ?? "") : "",
      numero: numeroIdx >= 0 ? (cells[numeroIdx] ?? "").trim() : "",
    });
  }
  return { headers, rows: dataRows };
}

function validateParsedCsv(parsed) {
  const hasNumero = parsed.headers.some((h) => h.toLowerCase() === "numero");
  if (!hasNumero) return { ok: false, error: 'El archivo debe contener una columna llamada "numero".' };
  if (parsed.rows.length > 1000) return { ok: false, error: "El archivo supera el límite de 1.000 números." };
  return { ok: true };
}

function lookupCompany(rawNumber) {
  const normalized = normalizePhoneForLookup(rawNumber);
  if (!normalized) return "";
  const num = Number(normalized);
  let lo = 0;
  let hi = index.ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end, companyIdx] = index.ranges[mid];
    if (num < start) hi = mid - 1;
    else if (num > end) lo = mid + 1;
    else return index.companies[companyIdx] ?? "";
  }
  return "";
}

function processRows(inputRows) {
  const cache = new Map();
  return inputRows.map((input) => {
    const trimmed = input.numero.trim();
    if (!trimmed) return { numero: input.original, compania: "", status: "empty" };
    const normalized = normalizePhoneForLookup(trimmed);
    if (!normalized) return { numero: input.original, compania: "", status: "invalid" };
    let compania = cache.get(normalized);
    if (compania === undefined) {
      compania = lookupCompany(trimmed);
      cache.set(normalized, compania);
    }
    return { numero: input.original, compania, status: "done" };
  });
}

function generateResultCsv(rows) {
  return ["numero,compania", ...rows.map((r) => `${r.numero},${r.compania}`)].join("\n");
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("Prueba 1 — CSV básico");
const p1 = parseCsv("numero\n912345678\n987654321\n912111222\n");
const r1 = processRows(p1.rows);
assert(r1.length === 3, "3 filas");
assert(r1[1].compania.includes("ENTEL"), "987654321 debe resolver ENTEL PCS");
console.log(" OK", r1.map((r) => [r.numero, r.compania]));

console.log("Prueba 2 — formatos +56");
const p2 = parseCsv("numero\n+56912345678\n+56 9 8765 4321\n9 1234 5678\n");
assert(normalizePhoneForLookup("+56912345678") === "912345678");
assert(normalizePhoneForLookup("56912345678") === "912345678");
assert(normalizePhoneForLookup("+56 912345678") === "912345678");
assert(normalizePhoneForLookup("+56 9 8765 4321") === "987654321");
assert(normalizePhoneForLookup("9 1234 5678") === "912345678");
assert(normalizePhoneForLookup("912345678") === "912345678");
const r2 = processRows(p2.rows);
assert(r2[0].numero === "+56912345678");
assert(r2[1].numero === "+56 9 8765 4321");
console.log(" OK");

console.log("Prueba 2b — formatos internacionales reales");
const real = [
  ["56971915057", "971915057"],
  ["56979492451", "979492451"],
  ["56991066201", "991066201"],
  ["5697792232", "977922320"],
  ["5699055619", "990556190"],
];
for (const [input, expected] of real) {
  assert(normalizePhoneForLookup(input) === expected, `${input} -> ${expected}`);
}
const p2b = parseCsv("numero\n56912345678\n912345678\n");
const r2b = processRows(p2b.rows);
assert(r2b[0].numero === "56912345678", "conserva original internacional");
assert(r2b[1].numero === "912345678", "conserva original nacional");
assert(r2b[0].compania === r2b[1].compania, "mismo lookup internacional y nacional");
console.log(" OK");

console.log("Prueba 3 — más de 1000");
const many = "numero\n" + Array.from({ length: 1001 }, (_, i) => `91234${String(i).padStart(4, "0")}`).join("\n");
const v3 = validateParsedCsv(parseCsv(many));
assert(!v3.ok && v3.error.includes("1.000"));
console.log(" OK");

console.log("Prueba 4 — sin columna numero");
const v4 = validateParsedCsv(parseCsv("telefono\n912345678\n"));
assert(!v4.ok && v4.error.includes("numero"));
console.log(" OK");

console.log("Prueba 5 — duplicados");
const r5 = processRows(parseCsv("numero\n912345678\n912345678\n912345678\n").rows);
assert(r5.length === 3);
console.log(" OK");

console.log("Prueba 6 — sin coincidencia");
const r6 = processRows(parseCsv("numero\n911234567\n").rows);
assert(r6[0].compania === "");
console.log(" OK");

console.log("Prueba 7 — columnas extra");
const r7 = processRows(parseCsv("numero,nombre\n912345678,Juan\n987654321,Pedro\n").rows);
const csv7 = generateResultCsv(r7);
assert(csv7.split("\n")[0] === "numero,compania");
assert(!csv7.includes("Juan"));
console.log(" OK");

console.log("\nTodas las pruebas pasaron.");
