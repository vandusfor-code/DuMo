// Helper compartido para scripts de mantenimiento: carga .env.local y crea el
// cliente de Google Sheets. Uso exclusivo desde la terminal (no en la app).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { google } from "googleapis";

export function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const raw = readFileSync(path, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (value.startsWith('"')) {
      // Valor escrito con JSON.stringify (comillas + \n escapados).
      try {
        value = JSON.parse(value);
      } catch {
        value = value.slice(1, -1).replace(/\\n/g, "\n");
      }
    } else {
      value = value.replace(/\\n/g, "\n");
    }
    env[key] = value;
  }
  return {
    projectId: env.GOOGLE_PROJECT_ID,
    clientEmail: env.GOOGLE_CLIENT_EMAIL,
    privateKey: env.GOOGLE_PRIVATE_KEY,
    sheetId: env.GOOGLE_SHEET_ID,
  };
}

export function getSheets(cfg) {
  const auth = new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}
