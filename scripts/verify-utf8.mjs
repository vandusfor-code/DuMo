// Prueba que la app almacena acentos/ñ correctamente en Google Sheets.
// Envía una venta con caracteres especiales por la API (UTF-8, igual que el
// navegador) y la relee desde el Sheet. Este archivo está en UTF-8, por lo que
// el body sale con la codificación correcta (a diferencia de curl en Windows).
const base = "http://localhost:3000";

const body = {
  customerName: "Andrés Muñoz Ñández",
  rut: "19.876.543-2",
  phone: "300 999 8877",
  email: "andres@dumo.cl",
  notes: "Prueba de codificación: canción, ñoño, integración, áéíóú.",
  lines: [{ phoneNumber: "300 999 8877", saleType: "new_line" }],
};

const created = await (
  await fetch(`${base}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
).json();

const detail = await (await fetch(`${base}/api/sales/${created.id}`)).json();

console.log("id      :", detail.id);
console.log("cliente :", detail.customer.name);
console.log("notas   :", detail.notes);
console.log("");
console.log("(Leído de vuelta desde Google Sheets — si los acentos se ven bien, la codificación es correcta)");
