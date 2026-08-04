// Genera el valor base64 de la private_key (una sola línea, a prueba de pegado)
// y lo escribe a un archivo local. NO imprime la clave en pantalla.
//
// Uso: node scripts/key-to-base64.mjs <ruta-al-service-account.json>
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error("Uso: node scripts/key-to-base64.mjs <ruta-service-account.json>");
  process.exit(1);
}

const creds = JSON.parse(readFileSync(resolve(jsonPath), "utf8"));
if (!creds.private_key || !creds.private_key.includes("BEGIN PRIVATE KEY")) {
  console.error("El JSON no contiene una private_key válida.");
  process.exit(1);
}

const base64 = Buffer.from(creds.private_key, "utf8").toString("base64");
const outPath = resolve(process.cwd(), "GOOGLE_PRIVATE_KEY_base64.txt");
writeFileSync(outPath, base64, "utf8");

console.log("✅ Valor base64 generado.");
console.log(`   Archivo : ${outPath}`);
console.log(`   Longitud: ${base64.length} caracteres`);
console.log("");
console.log("👉 Abre ese archivo, copia TODO el contenido (una sola línea) y");
console.log("   pégalo en Vercel como GOOGLE_PRIVATE_KEY. Luego BORRA el archivo.");
