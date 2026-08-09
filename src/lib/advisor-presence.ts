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
