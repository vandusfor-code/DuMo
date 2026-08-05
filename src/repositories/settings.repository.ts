import "server-only";
import type {
  SettingsSnapshot,
  SystemUser,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
  UpsertSystemUserInput,
} from "@/types/settings";
import { SETTINGS_MOCK } from "@/data/mock/settings.mock";
import { withLatency } from "@/lib/mock";

export interface SettingsRepository {
  getSnapshot(): Promise<SettingsSnapshot>;
  updateCompany(input: UpdateCompanyInput): Promise<SettingsSnapshot["company"]>;
  updateWhatsApp(input: UpdateWhatsAppInput): Promise<SettingsSnapshot["whatsapp"]>;
  updateGoogleSheets(input: UpdateGoogleSheetsInput): Promise<SettingsSnapshot["googleSheets"]>;
  testGoogleSheetsConnection(): Promise<{ ok: boolean; message: string }>;
  createUser(input: UpsertSystemUserInput): Promise<SystemUser>;
  updateUser(id: string, input: UpsertSystemUserInput): Promise<SystemUser>;
  deleteUser(id: string): Promise<void>;
  toggleUserActive(id: string, active: boolean): Promise<SystemUser>;
}

class MockSettingsRepository implements SettingsRepository {
  private snapshot = structuredClone(SETTINGS_MOCK);

  getSnapshot() {
    return withLatency(structuredClone(this.snapshot));
  }

  updateCompany(input: UpdateCompanyInput) {
    this.snapshot.company = { ...input };
    return withLatency({ ...this.snapshot.company });
  }

  updateWhatsApp(input: UpdateWhatsAppInput) {
    this.snapshot.whatsapp = {
      ...this.snapshot.whatsapp,
      ...input,
      connectionStatus: input.accessToken ? "connected" : "disconnected",
      lastSync: new Date().toISOString(),
    };
    this.snapshot.system.whatsappStatus = this.snapshot.whatsapp.connectionStatus;
    return withLatency({ ...this.snapshot.whatsapp });
  }

  updateGoogleSheets(input: UpdateGoogleSheetsInput) {
    this.snapshot.googleSheets = {
      ...this.snapshot.googleSheets,
      ...input,
    };
    return withLatency({ ...this.snapshot.googleSheets });
  }

  testGoogleSheetsConnection() {
    const ok = !!this.snapshot.googleSheets.spreadsheetId;
    return withLatency({
      ok,
      message: ok ? "Conexión exitosa con Google Sheets." : "Spreadsheet ID requerido.",
    });
  }

  createUser(input: UpsertSystemUserInput) {
    const user: SystemUser = {
      id: `usr-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
    };
    this.snapshot.users.push(user);
    return withLatency(user);
  }

  updateUser(id: string, input: UpsertSystemUserInput) {
    const idx = this.snapshot.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("Usuario no encontrado");
    this.snapshot.users[idx] = { ...this.snapshot.users[idx], ...input, id };
    return withLatency(this.snapshot.users[idx]);
  }

  deleteUser(id: string) {
    this.snapshot.users = this.snapshot.users.filter((u) => u.id !== id);
    return withLatency(undefined);
  }

  toggleUserActive(id: string, active: boolean) {
    const user = this.snapshot.users.find((u) => u.id === id);
    if (!user) throw new Error("Usuario no encontrado");
    user.active = active;
    return withLatency({ ...user });
  }
}

export function getSettingsRepository(): SettingsRepository {
  return new MockSettingsRepository();
}
