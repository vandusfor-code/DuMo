import "server-only";
import type { InboxState } from "@/types/inbox-state";

/** Bandeja asesora: solo conversaciones activas (no cerradas por tipificación). */
export const ADVISOR_INBOX_ACTIVE_STATE: InboxState = "active";

export function advisorBandejaIncludesInboxState(state: InboxState): boolean {
  return state === ADVISOR_INBOX_ACTIVE_STATE;
}
