import "server-only";
import type {
  SettingsSnapshot,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateInstagramInput,
  UpdateMessengerInput,
  UpdateWhatsAppInput,
} from "@/types/settings";
import { SETTINGS_DEFAULT } from "@/data/mock/settings.mock";
import { getSheetsClient } from "@/server/google/sheets-client";
import { getConfig, setConfig } from "@/server/db/app-config";
import { hasDatabase } from "@/server/db/client";
import {
  getMessengerIntegrationConfig,
  messengerVerifyToken,
  saveMessengerIntegrationConfig,
} from "@/server/messenger/config";
import {
  getInstagramIntegrationConfig,
  instagramVerifyToken,
  saveInstagramIntegrationConfig,
} from "@/server/instagram/config";

export interface SettingsRepository {
  getSnapshot(): Promise<SettingsSnapshot>;
  updateCompany(input: UpdateCompanyInput): Promise<SettingsSnapshot["company"]>;
  updateWhatsApp(input: UpdateWhatsAppInput): Promise<SettingsSnapshot["whatsapp"]>;
  updateMessenger(input: UpdateMessengerInput): Promise<SettingsSnapshot["messenger"]>;
  updateInstagram(input: UpdateInstagramInput): Promise<SettingsSnapshot["instagram"]>;
  updateGoogleSheets(input: UpdateGoogleSheetsInput): Promise<SettingsSnapshot["googleSheets"]>;
  testGoogleSheetsConnection(): Promise<{ ok: boolean; message: string }>;
}

const SETTINGS_KEY = "settings_snapshot";

type StoredSettings = Pick<
  SettingsSnapshot,
  "company" | "whatsapp" | "messenger" | "instagram" | "googleSheets"
>;

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
    messenger: {
      ...base.messenger,
      ...(stored.messenger ?? {}),
      pageAccessToken: stored.messenger?.pageAccessToken
        ? "••••••••••••••••"
        : base.messenger.pageAccessToken,
    },
    instagram: {
      ...base.instagram,
      ...(stored.instagram ?? {}),
      accessToken: stored.instagram?.accessToken
        ? "••••••••••••••••"
        : base.instagram.accessToken,
    },
    googleSheets: { ...base.googleSheets, ...stored.googleSheets },
  };
}

async function messengerStatusFromConfig(): Promise<SettingsSnapshot["messenger"]> {
  const base = baseSnapshot().messenger;
  const integration = await getMessengerIntegrationConfig();
  if (!integration) {
    return { ...base, verifyToken: messengerVerifyToken() };
  }
  return {
    pageId: integration.pageId,
    pageAccessToken: "••••••••••••••••",
    pageName: integration.pageName ?? "",
    verifyToken: messengerVerifyToken(),
    connectionStatus: "connected",
    lastSync: integration.updatedAt ?? null,
  };
}

async function instagramStatusFromConfig(): Promise<SettingsSnapshot["instagram"]> {
  const base = baseSnapshot().instagram;
  const integration = await getInstagramIntegrationConfig();
  if (!integration) {
    return { ...base, verifyToken: instagramVerifyToken() };
  }
  return {
    igUserId: integration.igUserId,
    accessToken: "••••••••••••••••",
    username: integration.username ?? "",
    verifyToken: instagramVerifyToken(),
    connectionStatus: "connected",
    lastSync: integration.updatedAt ?? null,
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
      messenger: {
        ...snapshot.messenger,
        pageAccessToken: snapshot.messenger.pageAccessToken ? "stored" : "",
      },
      instagram: {
        ...snapshot.instagram,
        accessToken: snapshot.instagram.accessToken ? "stored" : "",
      },
      googleSheets: snapshot.googleSheets,
    };
    await setConfig(SETTINGS_KEY, toStore);
  }

  async getSnapshot() {
    const stored = await this.loadStored();
    const snapshot = mergeSnapshot(stored);
    snapshot.messenger = await messengerStatusFromConfig();
    snapshot.instagram = await instagramStatusFromConfig();
    snapshot.system.messengerStatus = snapshot.messenger.connectionStatus;
    snapshot.system.instagramStatus = snapshot.instagram.connectionStatus;
    snapshot.system.googleSheetsStatus = "disconnected";
    return snapshot;
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

  async updateMessenger(input: UpdateMessengerInput) {
    const current = await getMessengerIntegrationConfig();
    const token =
      input.pageAccessToken && !input.pageAccessToken.includes("••")
        ? input.pageAccessToken
        : current?.pageAccessToken ?? "";

    if (!input.pageId.trim() || !token) {
      throw new Error("Page ID y Page Access Token son obligatorios.");
    }

    await saveMessengerIntegrationConfig({
      pageId: input.pageId,
      pageAccessToken: token,
      pageName: input.pageName,
    });

    const snapshot = await this.getSnapshot();
    snapshot.messenger = {
      pageId: input.pageId,
      pageAccessToken: "••••••••••••••••",
      pageName: input.pageName,
      verifyToken: messengerVerifyToken(),
      connectionStatus: "connected",
      lastSync: new Date().toISOString(),
    };
    snapshot.system.messengerStatus = "connected";
    await this.saveStored(snapshot);
    return { ...snapshot.messenger };
  }

  async updateInstagram(input: UpdateInstagramInput) {
    const current = await getInstagramIntegrationConfig();
    const token =
      input.accessToken && !input.accessToken.includes("••")
        ? input.accessToken
        : current?.accessToken ?? "";

    if (!input.igUserId.trim() || !token) {
      throw new Error("IG User ID y Access Token son obligatorios.");
    }

    await saveInstagramIntegrationConfig({
      igUserId: input.igUserId,
      accessToken: token,
      username: input.username,
    });

    const snapshot = await this.getSnapshot();
    snapshot.instagram = {
      igUserId: input.igUserId,
      accessToken: "••••••••••••••••",
      username: input.username,
      verifyToken: instagramVerifyToken(),
      connectionStatus: "connected",
      lastSync: new Date().toISOString(),
    };
    snapshot.system.instagramStatus = "connected";
    await this.saveStored(snapshot);
    return { ...snapshot.instagram };
  }

  async updateGoogleSheets(input: UpdateGoogleSheetsInput) {
    const snapshot = await this.getSnapshot();
    snapshot.googleSheets = { ...snapshot.googleSheets, ...input };
    snapshot.system.googleSheetsStatus = "disconnected";
    await this.saveStored(snapshot);
    return { ...snapshot.googleSheets };
  }

  testGoogleSheetsConnection() {
    return Promise.resolve({
      ok: true,
      message:
        "DuMo guarda los datos en Supabase/Postgres. Google Sheets ya no es necesario para el funcionamiento.",
    });
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

  updateMessenger(input: UpdateMessengerInput) {
    this.snapshot.messenger = {
      ...this.snapshot.messenger,
      ...input,
      pageAccessToken: input.pageAccessToken ? "••••••••••••••••" : "",
      connectionStatus: input.pageAccessToken ? "connected" : "disconnected",
      lastSync: new Date().toISOString(),
    };
    this.snapshot.system.messengerStatus = this.snapshot.messenger.connectionStatus;
    return Promise.resolve({ ...this.snapshot.messenger });
  }

  updateInstagram(input: UpdateInstagramInput) {
    this.snapshot.instagram = {
      ...this.snapshot.instagram,
      ...input,
      accessToken: input.accessToken ? "••••••••••••••••" : "",
      connectionStatus: input.accessToken ? "connected" : "disconnected",
      lastSync: new Date().toISOString(),
    };
    this.snapshot.system.instagramStatus = this.snapshot.instagram.connectionStatus;
    return Promise.resolve({ ...this.snapshot.instagram });
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
