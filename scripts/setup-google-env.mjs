// Genera .env.local a partir del JSON del service account de Google.
// La clave privada se escribe directamente de archivo a archivo: nunca se
// imprime ni pasa por la terminal en texto plano.
//
// Uso:
//   node scripts/setup-google-env.mjs <ruta-al-service-account.json> <GOOGLE_SHEET_ID>

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [, , jsonPath, sheetId] = process.argv;

if (!jsonPath || !sheetId) {
  console.error(
    "Uso: node scripts/setup-google-env.mjs <ruta-service-account.json> <GOOGLE_SHEET_ID>",
  );
  process.exit(1);
}

const absJson = resolve(jsonPath);
if (!existsSync(absJson)) {
  console.error(`No se encontró el archivo JSON en: ${absJson}`);
  process.exit(1);
}

let creds;
try {
  creds = JSON.parse(readFileSync(absJson, "utf8"));
} catch {
  console.error("El archivo no es un JSON válido.");
  process.exit(1);
}

const { project_id, client_email, private_key } = creds;
if (!project_id || !client_email || !private_key) {
  console.error(
    "El JSON no contiene project_id / client_email / private_key. ¿Es la key del service account?",
  );
  process.exit(1);
}

// JSON.stringify produce comillas dobles + \n escapados: formato ideal para .env
const envContent = `# Generado por scripts/setup-google-env.mjs — NO COMMITEAR
GOOGLE_PROJECT_ID=${project_id}
GOOGLE_CLIENT_EMAIL=${client_email}
GOOGLE_PRIVATE_KEY=${JSON.stringify(private_key)}
GOOGLE_SHEET_ID=${sheetId}
`;

const outPath = resolve(process.cwd(), ".env.local");
writeFileSync(outPath, envContent, { encoding: "utf8" });

console.log("✅ .env.local generado correctamente.");
console.log(`   GOOGLE_PROJECT_ID   = ${project_id}`);
console.log(`   GOOGLE_CLIENT_EMAIL = ${client_email}`);
console.log(`   GOOGLE_SHEET_ID     = ${sheetId}`);
console.log(`   GOOGLE_PRIVATE_KEY  = *** oculta (${private_key.length} chars) ***`);
console.log("");
console.log(`👉 Comparte el Sheet con: ${client_email} (rol Editor)`);
