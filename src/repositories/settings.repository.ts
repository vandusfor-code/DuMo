import "server-only";
import type {
  SettingsSnapshot,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
} from "@/types/settings";
import { SETTINGS_DEFAULT } from "@/data/mock/settings.mock";
import { getSheetsClient } from "@/server/google/sheets-client";

export interface SettingsRepository {
  getSnapshot(): Promise<SettingsSnapshot>;
  updateCompany(input: UpdateCompanyInput): Promise<SettingsSnapshot["company"]>;
  updateWhatsApp(input: UpdateWhatsAppInput): Promise<SettingsSnapshot["whatsapp"]>;
  updateGoogleSheets(input: UpdateGoogleSheetsInput): Promise<SettingsSnapshot["googleSheets"]>;
  testGoogleSheetsConnection(): Promise<{ ok: boolean; message: string }>;
}

class SettingsRepositoryImpl implements SettingsRepository {
  private snapshot = structuredClone(SETTINGS_DEFAULT);

  getSnapshot() {
    return Promise.resolve(structuredClone(this.snapshot));
  }

  updateCompany(input: UpdateCompanyInput) {
    this.snapshot.company = { ...input };
    return Promise.resolve({ ...this.snapshot.company });
  }

  updateWhatsApp(input: UpdateWhatsAppInput) {
    this.snapshot.whatsapp = {
      ...this.snapshot.whatsapp,
      ...input,
      accessToken: input.accessToken ? "••••••••••••••••" : "",
      connectionStatus: input.accessToken ? "connected" : "disconnected",
      lastSync: new Date().toISOString(),
    };
    this.snapshot.system.whatsappStatus = this.snapshot.whatsapp.connectionStatus;
    return Promise.resolve({ ...this.snapshot.whatsapp });
  }

  updateGoogleSheets(input: UpdateGoogleSheetsInput) {
    this.snapshot.googleSheets = { ...this.snapshot.googleSheets, ...input };
    this.snapshot.system.googleSheetsStatus = input.spreadsheetId ? "connected" : "disconnected";
    return Promise.resolve({ ...this.snapshot.googleSheets });
  }

  testGoogleSheetsConnection() {
    const client = getSheetsClient();
    if (!client) {
      return Promise.resolve({
        ok: false,
        message: "Google Sheets no está configurado. Revisa las variables de entorno.",
      });
    }
    return Promise.resolve({ ok: true, message: "Conexión exitosa con Google Sheets." });
  }
}

export function getSettingsRepository(): SettingsRepository {
  return new SettingsRepositoryImpl();
}
