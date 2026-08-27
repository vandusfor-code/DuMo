import type { TipificationFollowUpMode } from "@/types/tipification";

/** Defaults seguros cuando una fila legacy no tiene comportamiento configurado. */
export const TIPIFICATION_BEHAVIOR_DEFAULTS = {
  closesInbox: false,
  createsFollowUp: false,
  opensCustomForm: false,
  followUpMode: "none" as TipificationFollowUpMode,
  followUpDefaultDays: null as number | null,
};

export function parseTipificationFollowUpMode(value: unknown): TipificationFollowUpMode {
  const modes: TipificationFollowUpMode[] = ["none", "fixed", "manual", "manual_suggested"];
  const raw = String(value ?? "none");
  return modes.includes(raw as TipificationFollowUpMode)
    ? (raw as TipificationFollowUpMode)
    : "none";
}
