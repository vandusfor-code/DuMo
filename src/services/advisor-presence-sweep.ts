import "server-only";
import { getAdvisorPresenceRepository } from "@/repositories/advisor-presence.repository";

/** Barrido de asesoras "conectadas" sin heartbeat reciente — mismo patrón que el barrido SLA. */
let lastSweepAt = 0;
const PRESENCE_SWEEP_INTERVAL_MS = 60_000;

export async function reconcileStalePresenceThrottled(): Promise<void> {
  if (Date.now() - lastSweepAt < PRESENCE_SWEEP_INTERVAL_MS) return;
  lastSweepAt = Date.now();
  await reconcileStalePresence();
}

export async function reconcileStalePresence(): Promise<void> {
  const staleIds = await getAdvisorPresenceRepository().listStaleAdvisorIds();
  if (staleIds.length === 0) return;

  const { adminLiveService } = await import("@/services/admin-live.service");
  for (const advisorId of staleIds) {
    try {
      await adminLiveService.setAdvisorPresence(
        advisorId,
        "desconectado",
        "system:inactividad",
        { revokeSessionOnDisconnect: false },
      );
    } catch (err) {
      console.error("[advisor-presence-sweep] fallo desconectando", advisorId, err);
    }
  }
}
