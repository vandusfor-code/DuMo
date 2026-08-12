import "server-only";
import { getConfig, setConfig } from "@/server/db/app-config";

export const SLA_AUTO_REASSIGN_KEY = "sla_auto_reassign";

export interface SlaAutoReassignSettings {
  enabled: boolean;
}

/** Interruptor real — igual que "Asignación automática". Por defecto activo. */
export async function getSlaAutoReassignSettings(): Promise<SlaAutoReassignSettings> {
  return getConfig<SlaAutoReassignSettings>(SLA_AUTO_REASSIGN_KEY, { enabled: true });
}

export async function setSlaAutoReassignEnabled(enabled: boolean): Promise<SlaAutoReassignSettings> {
  const next = { enabled };
  await setConfig(SLA_AUTO_REASSIGN_KEY, next);
  return next;
}

export async function isSlaAutoReassignEnabled(): Promise<boolean> {
  const settings = await getSlaAutoReassignSettings();
  return settings.enabled;
}
