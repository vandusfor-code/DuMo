/** Escenario A (primer contacto) vs Escenario B (mensaje de seguimiento). */
export type ResponseSlaScenario = "first_contact" | "follow_up";

export type ResponseSlaStatus =
  | "awaiting_response"
  | "warning_sent"
  | "final_warning_sent"
  | "threshold_reached"
  | "escalated_no_advisor"
  | "reassigned"
  | "resolved";

/** Estado actual del temporizador de una conversación (una fila = el estado vigente). */
export interface ResponseSlaTimer {
  conversationId: string;
  advisorId: string;
  scenario: ResponseSlaScenario;
  armedAt: string;
  triggerMessageId: string;
  status: ResponseSlaStatus;
  warningSentAt: string | null;
  finalWarningSentAt: string | null;
  lastAdminAlertAt: string | null;
  escalationCycleCount: number;
  bullmqJobId: string | null;
  updatedAt: string;
}

export interface SlaReassignmentLogEntry {
  id: string;
  conversationId: string;
  originalAdvisorId: string;
  originalAdvisorName: string;
  newAdvisorId: string | null;
  newAdvisorName: string | null;
  scenario: ResponseSlaScenario;
  reason: string;
  unansweredMessageId: string;
  minutesUnanswered: number;
  createdAt: string;
}

/**
 * Umbrales en minutos por escenario — coinciden con el spec del negocio.
 * first_contact: min 1 = aviso suave, min 2 = aviso final, min 3 = umbral (reasignar).
 * follow_up: min 4 = aviso único, min 5 = umbral (reasignar).
 */
export const RESPONSE_SLA_THRESHOLDS: Record<
  ResponseSlaScenario,
  { warningMinutes: number; finalWarningMinutes: number | null; escalateMinutes: number }
> = {
  first_contact: { warningMinutes: 1, finalWarningMinutes: 2, escalateMinutes: 3 },
  follow_up: { warningMinutes: 4, finalWarningMinutes: null, escalateMinutes: 5 },
};

/** Cooldown entre envíos de WhatsApp a admins para el mismo lead (Escenario C). */
export const SLA_ADMIN_ALERT_COOLDOWN_MINUTES = 2;

/** Escenario C — reintenta buscar asesora disponible cada minuto hasta que alguien responda o quede libre. */
export const SLA_ESCALATION_RETRY_MS = 60_000;

/** Números fijos de admin (con indicativo país) para la alerta de WhatsApp del Escenario C. */
export const SLA_ADMIN_ALERT_PHONES = ["573148127388", "573212549656"] as const;

const CHANNEL_LABELS: Record<string, string> = {
  web_qr: "WhatsApp Web",
  messenger: "Messenger",
  instagram: "Instagram",
  whatsapp: "WABA",
};

export function slaChannelLabel(channel: string): string {
  return CHANNEL_LABELS[channel] ?? channel;
}

/** Formato exacto acordado para la alerta de WhatsApp a admins — Escenario C. */
export function buildSlaAdminAlertMessage(input: {
  customerName: string;
  advisorName: string;
  minutesUnanswered: number;
  channelLabel: string;
  conversationId: string;
}): string {
  return `⚠️ DuMo - Alerta de respuesta

Lead sin atender: ${input.customerName}
Asesora asignada: ${input.advisorName}
Tiempo sin respuesta: ${input.minutesUnanswered} min
Canal: ${input.channelLabel}

No hay otra asesora disponible para reasignar.

Ver conversación:
https://du-mo.vercel.app/admin/leads?conversationId=${input.conversationId}`;
}

/** Minuto (desde armed_at) del próximo umbral a evaluar tras `status` — null si no queda ninguno en RESP-1. */
export function nextThresholdMinutes(
  scenario: ResponseSlaScenario,
  status: ResponseSlaStatus,
): number | null {
  const t = RESPONSE_SLA_THRESHOLDS[scenario];
  if (status === "awaiting_response") return t.warningMinutes;
  if (status === "warning_sent") return t.finalWarningMinutes ?? t.escalateMinutes;
  if (status === "final_warning_sent") return t.escalateMinutes;
  return null;
}

/** Milisegundos desde ahora hasta que se cumplan `targetMinutes` contados desde `armedAt`. */
export function delayMsUntilThreshold(targetMinutes: number, armedAt: string): number {
  const targetMs = new Date(armedAt).getTime() + targetMinutes * 60_000;
  return Math.max(0, targetMs - Date.now());
}
