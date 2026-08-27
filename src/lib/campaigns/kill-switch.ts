import { getConfig, setConfig } from "@/server/db/app-config";

export const CAMPAIGNS_KILL_SWITCH_KEY = "campaigns_kill_switch";

export function isCampaignsKillSwitchActive(): Promise<boolean> {
  return getConfig<boolean>(CAMPAIGNS_KILL_SWITCH_KEY, false);
}

export function setCampaignsKillSwitch(active: boolean): Promise<void> {
  return setConfig<boolean>(CAMPAIGNS_KILL_SWITCH_KEY, active);
}
