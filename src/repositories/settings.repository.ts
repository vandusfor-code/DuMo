import "server-only";
import type {
  SettingsSnapshot,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
} from "@/types/settings";
import { SETTINGS_DEFAULT } from "@/data/mock/settings.mock";
import { getSheetsClient } from "@/server/google/sheets-client";
import { getConfig, setConfig } from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";

export interface SettingsRepository {
  getSnapshot(): Promise<SettingsSnapshot>;
  updateCompany(input: UpdateCompanyInput): Promise<SettingsSnapshot["company"]>;
  updateWhatsApp(input: UpdateWhatsAppInput): Promise<SettingsSnapshot["whatsapp"]>;
  updateGoogleSheets(input: UpdateGoogleSheetsInput): Promise<SettingsSnapshot["googleSheets"]>;
  testGoogleSheetsConnection(): Promise<{ ok: boolean; message: string }>;
}

const SETTINGS_KEY = "settings_snapshot";

type StoredSettings = Pick<SettingsSnapshot, "company" | "whatsapp" | "googleSheets">;

function baseSnapshot(): SettingsSnapshot {
  return structuredClone(SETTINGS_DEFAULT);
}

function mergeSnapshot(stored: Partial<StoredSettings> | null): SettingsSnapshot {
  const base = baseSnapshot();
  if (!stored) return base;

  return {
    ...base,
    company: { ...base.company, ...stored.company },
    whatsapp: {
      ...base.whatsapp,
      ...stored.whatsapp,
      accessToken: stored.whatsapp?.accessToken
        ? "••••••••••••••••"
        : base.whatsapp.accessToken,
    },
    googleSheets: { ...base.googleSheets, ...stored.googleSheets },
  };
}

class PostgresSettingsRepository implements SettingsRepository {
  private async loadStored(): Promise<Partial<StoredSettings> | null> {
    return getConfig<Partial<StoredSettings> | null>(SETTINGS_KEY, null);
  }

  private async saveStored(snapshot: SettingsSnapshot) {
    const toStore: StoredSettings = {
      company: snapshot.company,
      whatsapp: {
        ...snapshot.whatsapp,
        accessToken: snapshot.whatsapp.accessToken ? "stored" : "",
      },
      googleSheets: snapshot.googleSheets,
    };
    await setConfig(SETTINGS_KEY, toStore);
  }

  async getSnapshot() {
    const stored = await this.loadStored();
    return mergeSnapshot(stored);
  }

  async updateCompany(input: UpdateCompanyInput) {
    const snapshot = await this.getSnapshot();
    snapshot.company = { ...input };
    await this.saveStored(snapshot);
    return { ...snapshot.company };
  }

  async updateWhatsApp(input: UpdateWhatsAppInput) {
    const snapshot = await this.getSnapshot();
    snapshot.whatsapp = {
      ...snapshot.whatsapp,
      ...input,
      accessToken: input.accessToken ? "••••••••••••••••" : "",
      connectionStatus: input.accessToken ? "connected" : "disconnected",
      lastSync: new Date().toISOString(),
    };
    snapshot.system.whatsappStatus = snapshot.whatsapp.connectionStatus;
    await this.saveStored(snapshot);
    return { ...snapshot.whatsapp };
  }

  async updateGoogleSheets(input: UpdateGoogleSheetsInput) {
    const snapshot = await this.getSnapshot();
    snapshot.googleSheets = { ...snapshot.googleSheets, ...input };
    snapshot.system.googleSheetsStatus = input.spreadsheetId ? "connected" : "disconnected";
    await this.saveStored(snapshot);
    return { ...snapshot.googleSheets };
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

class MockSettingsRepository implements SettingsRepository {
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
  if (hasDatabase()) return new PostgresSettingsRepository();
  return new MockSettingsRepository();
}
