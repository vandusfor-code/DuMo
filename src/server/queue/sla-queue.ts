import "server-only";
import { Queue } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import { SLA_QUEUE_NAME, slaJobId, type SlaCheckJob } from "@/server/queue/sla-jobs";

let queue: Queue<SlaCheckJob> | null = null;

function getSlaQueue(): Queue<SlaCheckJob> | null {
  if (!isQueueEnabled()) return null;
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue<SlaCheckJob>(SLA_QUEUE_NAME, { connection });
    queue.on("error", (err) => console.error("[sla-queue] error", err));
  }
  return queue;
}

/**
 * Programa (o reprograma) el chequeo diferido del timer SLA. Best-effort:
 * si Redis no está configurado, devuelve null sin lanzar — el barrido
 * periódico (`reconcileDueTimers`) es la red de seguridad que igual detecta
 * el vencimiento, con más latencia pero sin depender de esta cola.
 */
export async function scheduleSlaCheck(
  conversationId: string,
  delayMs: number,
): Promise<string | null> {
  const q = getSlaQueue();
  if (!q) return null;
  const jobId = slaJobId(conversationId);
  await cancelSlaCheck(conversationId);
  const job: SlaCheckJob = { conversationId };
  await q.add("check", job, {
    jobId,
    delay: Math.max(0, delayMs),
    removeOnComplete: 500,
    removeOnFail: 500,
  });
  return jobId;
}

/** Cancela el chequeo diferido pendiente de esta conversación, si existe. No lanza si no hay cola. */
export async function cancelSlaCheck(conversationId: string): Promise<void> {
  const q = getSlaQueue();
  if (!q) return;
  const jobId = slaJobId(conversationId);
  const job = await q.getJob(jobId);
  if (job) await job.remove();
}
