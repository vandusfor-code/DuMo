import "server-only";
import { getSettingsRepository } from "@/repositories/settings.repository";
import type {
  SettingsSnapshot,
  SystemUser,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
  UpsertSystemUserInput,
} from "@/types/settings";

export const settingsService = {
  getSnapshot(): Promise<SettingsSnapshot> {
    return getSettingsRepository().getSnapshot();
  },
  updateCompany(input: UpdateCompanyInput) {
    return getSettingsRepository().updateCompany(input);
  },
  updateWhatsApp(input: UpdateWhatsAppInput) {
    return getSettingsRepository().updateWhatsApp(input);
  },
  updateGoogleSheets(input: UpdateGoogleSheetsInput) {
    return getSettingsRepository().updateGoogleSheets(input);
  },
  testGoogleSheetsConnection() {
    return getSettingsRepository().testGoogleSheetsConnection();
  },
  createUser(input: UpsertSystemUserInput): Promise<SystemUser> {
    return getSettingsRepository().createUser(input);
  },
  updateUser(id: string, input: UpsertSystemUserInput): Promise<SystemUser> {
    return getSettingsRepository().updateUser(id, input);
  },
  deleteUser(id: string): Promise<void> {
    return getSettingsRepository().deleteUser(id);
  },
  toggleUserActive(id: string, active: boolean): Promise<SystemUser> {
    return getSettingsRepository().toggleUserActive(id, active);
  },
};
