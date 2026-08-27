export type CampaignStatus =
  | "BORRADOR"
  | "VALIDANDO"
  | "PROGRAMADA"
  | "EN_COLA"
  | "EJECUTANDO"
  | "PAUSADA"
  | "AUTO_PAUSADA"
  | "COMPLETADA"
  | "CANCELADA"
  | "ERROR";

export type CampaignContactStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "FAILED"
  | "EXCLUDED"
  | "CANCELLED"
  | "INVALID"
  | "DUPLICATE"
  | "OPTED_OUT";

export type CampaignEventType =
  | "CAMPAIGN_CREATED"
  | "FILE_IMPORTED"
  | "CONTACT_VALIDATED"
  | "CAMPAIGN_STARTED"
  | "MESSAGE_QUEUED"
  | "MESSAGE_PROCESSING"
  | "MESSAGE_SENT"
  | "MESSAGE_FAILED"
  | "CAMPAIGN_PAUSED"
  | "CAMPAIGN_RESUMED"
  | "CAMPAIGN_CANCELLED"
  | "CAMPAIGN_AUTO_PAUSED"
  | "OPT_OUT_DETECTED"
  | "CAMPAIGN_COMPLETED"
  | "CONTACT_STALE_DETECTED"
  | "CONTACT_STALE_REQUEUED"
  | "CONTACT_STALE_MARKED_FAILED"
  | "CONTACT_RESPONSE_RECEIVED";

export interface Campaign {
  id: string;
  companyId: string;
  name: string;
  description: string;
  status: CampaignStatus;
  messageTemplate: string;
  provider: string;
  intervalSeconds: number;
  concurrency: number;
  maxRetries: number;
  totalContacts: number;
  eligibleContacts: number;
  sentCount: number;
  failedCount: number;
  excludedCount: number;
  responseCount: number;
  optOutCount: number;
  riskStatus: "ok" | "auto_paused";
  riskReason: string | null;
  consecutiveFailures: number;
  currentJobId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  pausedAt: string | null;
  finishedAt: string | null;
}

export interface CampaignContact {
  id: string;
  campaignId: string;
  companyId: string;
  rawPayload: Record<string, unknown>;
  name: string;
  phone: string;
  phoneRaw: string;
  status: CampaignContactStatus;
  attempts: number;
  providerMessageId: string | null;
  error: string | null;
  conversationId: string | null;
  lockedAt: string | null;
  sentAt: string | null;
  responseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignEvent {
  id: string;
  campaignId: string;
  campaignContactId: string | null;
  eventType: CampaignEventType;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CampaignSuppression {
  id: string;
  companyId: string;
  phone: string;
  reason: string;
  source: string;
  createdAt: string;
}

/** Detección de fila mapeada del archivo subido a columnas conocidas. */
export type CampaignColumnField = "name" | "phone" | "rut" | "company";

export interface CampaignColumnMapping {
  /** header original del archivo -> campo destino (o null si no se usa). */
  [header: string]: CampaignColumnField | null;
}

export interface CampaignImportPreviewRow {
  rowNumber: number;
  values: Record<string, string>;
}

export interface CampaignValidationSummary {
  total: number;
  eligible: number;
  invalid: number;
  duplicate: number;
  excluded: number;
  optedOut: number;
}

export interface CreateCampaignInput {
  name: string;
  description?: string;
}

export interface CampaignSettingsInput {
  intervalSeconds: number;
  concurrency: number;
  maxRetries: number;
}
