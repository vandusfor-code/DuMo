import "server-only";
import type { SettingsSnapshot } from "@/types/settings";

function envStatus(ok: boolean): "connected" | "disconnected" {
  return ok ? "connected" : "disconnected";
}

/** Configuración inicial desde variables de entorno — sin datos falsos. */
export const SETTINGS_DEFAULT: SettingsSnapshot = {
  company: {
    logoUrl: "/logo-dumo.svg",
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
  },
  whatsapp: {
    businessId: process.env.WHATSAPP_BUSINESS_ID ?? "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    accessToken: process.env.WHATSAPP_TOKEN ? "••••••••••••••••" : "",
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
    connectionStatus: envStatus(!!process.env.WHATSAPP_TOKEN),
    lastSync: null,
  },
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEET_ID ?? "",
    sheetName: process.env.GOOGLE_SHEET_NAME ?? "DuMo_Data",
    connectionStatus: envStatus(!!process.env.GOOGLE_SHEET_ID && !!process.env.GOOGLE_CLIENT_EMAIL),
    lastSync: null,
  },
  system: {
    version: process.env.npm_package_version ?? "1.0.0",
    googleSheetsStatus: envStatus(!!process.env.GOOGLE_SHEET_ID),
    whatsappStatus: envStatus(!!process.env.WHATSAPP_TOKEN),
    apisStatus: envStatus(!!(process.env.DATABASE_URL1 || process.env.DATABASE_URL)),
    lastBackup: null,
  },
  logs: [],
};
