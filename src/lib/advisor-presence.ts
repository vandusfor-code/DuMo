/** Estados operativos de presencia de asesora (módulo Live). */
export const ADVISOR_PRESENCE_STATUSES = [
  "disponible",
  "bano",
  "almuerzo",
  "desconectado",
] as const;

export type AdvisorPresenceStatus = (typeof ADVISOR_PRESENCE_STATUSES)[number];

export const ADVISOR_PRESENCE_LABELS: Record<AdvisorPresenceStatus, string> = {
  disponible: "Disponible",
  bano: "Baño",
  almuerzo: "Almuerzo",
  desconectado: "Desconectado",
};

/** Estados en los que la asesora sigue recibiendo leads nuevos por auto-asignación. */
export function advisorReceivesLeads(status: AdvisorPresenceStatus): boolean {
  return status === "disponible";
}

/** Ventana usada hoy para “conectada” (auto-asignación y Live). */
export const ADVISOR_ONLINE_WINDOW_MINUTES = 10;

export function isAdvisorPresenceStatus(value: string): value is AdvisorPresenceStatus {
  return (ADVISOR_PRESENCE_STATUSES as readonly string[]).includes(value);
}

/** Estado mostrado en Live: fuera de la ventana de conexión ⇒ desconectado. */
export function effectiveAdvisorPresenceStatus(
  isOnline: boolean,
  stored: AdvisorPresenceStatus,
): AdvisorPresenceStatus {
  if (!isOnline) return "desconectado";
  return stored;
}
