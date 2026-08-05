import "server-only";
import { getSettingsRepository } from "@/repositories/settings.repository";
import type {
  SettingsSnapshot,
  UpdateCompanyInput,
  UpdateGoogleSheetsInput,
  UpdateWhatsAppInput,
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
};
