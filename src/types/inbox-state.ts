/** Estado de la conversación en la bandeja de la asesora. */
export type InboxState = "active" | "closed";

export const DEFAULT_INBOX_STATE: InboxState = "active";

export function parseInboxState(value: unknown): InboxState {
  return String(value) === "closed" ? "closed" : "active";
}
