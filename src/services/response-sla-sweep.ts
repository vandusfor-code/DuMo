import "server-only";
import { reconcileDueTimers } from "@/services/response-sla.service";

/** Throttle del barrido SLA (por instancia serverless) — mismo patrón que el de auto-asignación. */
let lastSweepAt = 0;
const SLA_SWEEP_INTERVAL_MS = 20_000;

export async function reconcileDueTimersThrottled(): Promise<void> {
  if (Date.now() - lastSweepAt < SLA_SWEEP_INTERVAL_MS) return;
  lastSweepAt = Date.now();
  await reconcileDueTimers();
}
