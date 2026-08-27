export type UserRole = "administrador" | "supervisor" | "asesora" | "sistema";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  asesora: "Asesora",
  sistema: "Sistema",
};

export type ConnectionStatus = "connected" | "disconnected" | "error";

export interface CompanySettings {
  logoUrl: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface WhatsAppSettings {
  businessId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  connectionStatus: ConnectionStatus;
  lastSync: string | null;
}

export interface MessengerSettings {
  pageId: string;
  pageAccessToken: string;
  pageName: string;
  /** Solo lectura — proviene de MESSENGER_VERIFY_TOKEN / WHATSAPP_VERIFY_TOKEN en Vercel. */
  verifyToken: string;
  connectionStatus: ConnectionStatus;
  lastSync: string | null;
}

export interface InstagramSettings {
  igUserId: string;
  accessToken: string;
  username: string;
  /** Solo lectura — proviene de INSTAGRAM_VERIFY_TOKEN (o los de Messenger/WhatsApp) en Vercel. */
  verifyToken: string;
  connectionStatus: ConnectionStatus;
  lastSync: string | null;
}

export interface GoogleSheetsSettings {
  spreadsheetId: string;
  sheetName: string;
  connectionStatus: ConnectionStatus;
  lastSync: string | null;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  avatarUrl?: string;
}

export interface SystemStatus {
  version: string;
  googleSheetsStatus: ConnectionStatus;
  whatsappStatus: ConnectionStatus;
  messengerStatus: ConnectionStatus;
  instagramStatus: ConnectionStatus;
  apisStatus: ConnectionStatus;
  lastBackup: string | null;
}

export interface SystemLog {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  at: string;
}

export interface SettingsSnapshot {
  company: CompanySettings;
  whatsapp: WhatsAppSettings;
  messenger: MessengerSettings;
  instagram: InstagramSettings;
  googleSheets: GoogleSheetsSettings;
  system: SystemStatus;
  logs: SystemLog[];
}

export interface UpdateCompanyInput {
  logoUrl: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export interface UpdateWhatsAppInput {
  businessId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
}

export interface UpdateMessengerInput {
  pageId: string;
  pageAccessToken: string;
  pageName: string;
}

export interface UpdateInstagramInput {
  igUserId: string;
  accessToken: string;
  username: string;
}

export interface UpdateGoogleSheetsInput {
  spreadsheetId: string;
  sheetName: string;
}

export interface UpsertSystemUserInput {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  password?: string;
}
