import type { SettingsSnapshot, SystemLog, SystemUser } from "@/types/settings";

export const COMPANY_SETTINGS_MOCK = {
  logoUrl: "/logo-dumo.svg",
  name: "DuMo Telecom",
  address: "Calle 100 # 19-54, Of. 801",
  city: "Bogotá, Colombia",
  phone: "+57 314 812 7388",
  email: "contacto@dumo.cl",
};

export const WHATSAPP_SETTINGS_MOCK = {
  businessId: "1399061204706262",
  phoneNumberId: "696346603563682",
  accessToken: "••••••••••••••••",
  verifyToken: "dumo_verify_2026",
  connectionStatus: "connected" as const,
  lastSync: "2025-08-04T21:30:00",
};

export const GOOGLE_SHEETS_SETTINGS_MOCK = {
  spreadsheetId: "1abcXYZ_example_spreadsheet_id",
  sheetName: "DuMo_Data",
  connectionStatus: "disconnected" as const,
  lastSync: null,
};

export const SYSTEM_USERS_MOCK: SystemUser[] = [
  { id: "usr-duvan-admin", name: "Duvan Ramos", email: "ventaswom@dulabs.co", role: "administrador", active: true },
  { id: "usr-sup", name: "Carolina Supervisor", email: "supervisor@dumo.cl", role: "supervisor", active: true },
  { id: "usr-001", name: "María López", email: "maria.lopez@dumo.cl", role: "asesora", active: true, avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=80&h=80&q=80" },
  { id: "usr-002", name: "Laura Torres", email: "laura.torres@dumo.cl", role: "asesora", active: true },
  { id: "usr-003", name: "Andrea Ruiz", email: "andrea.ruiz@dumo.cl", role: "asesora", active: false },
  { id: "usr-sys", name: "DuMo Bot", email: "system@dumo.cl", role: "sistema", active: true },
];

export const SYSTEM_LOGS_MOCK: SystemLog[] = [
  { id: "log-1", level: "info", message: "Webhook WhatsApp recibido — 3 mensajes", at: "2025-08-04 21:28" },
  { id: "log-2", level: "warn", message: "Google Sheets no configurado — usando datos mock", at: "2025-08-04 20:15" },
  { id: "log-3", level: "info", message: "Respaldo automático completado", at: "2025-08-04 03:00" },
  { id: "log-4", level: "error", message: "Error envío WhatsApp — permisos insuficientes", at: "2025-08-03 18:42" },
];

export const SETTINGS_MOCK: SettingsSnapshot = {
  company: COMPANY_SETTINGS_MOCK,
  whatsapp: WHATSAPP_SETTINGS_MOCK,
  googleSheets: GOOGLE_SHEETS_SETTINGS_MOCK,
  users: SYSTEM_USERS_MOCK,
  system: {
    version: "1.4.2",
    googleSheetsStatus: "disconnected",
    whatsappStatus: "connected",
    apisStatus: "connected",
    lastBackup: "2025-08-04T03:00:00",
  },
  logs: SYSTEM_LOGS_MOCK,
};
