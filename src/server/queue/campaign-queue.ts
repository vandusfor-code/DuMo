import "server-only";
import { Queue } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import { CAMPAIGN_QUEUE_NAME, type CampaignJobData } from "@/server/queue/campaign-jobs";

let queue: Queue<CampaignJobData> | null = null;

function getCampaignQueue(): Queue<CampaignJobData> | null {
  if (!isQueueEnabled()) return null;
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue<CampaignJobData>(CAMPAIGN_QUEUE_NAME, { connection });
    queue.on("error", (err) => console.error("[campaign-queue] error", err));
  }
  return queue;
}

/**
 * Encola el siguiente "tick" de una campaña — procesa exactamente un
 * contacto y, si corresponde, se reprograma a sí mismo. `delayMs` es el
 * intervalo configurado entre envíos (0 para el primer tick, inmediato).
 * jobId único por llamada (no deduplicado por BullMQ): la protección contra
 * doble tick activo por campaña vive en `campaigns.current_job_id` — cada
 * tick solo actúa si su propio job.id coincide con el guardado ahí.
 */
export async function enqueueCampaignTick(campaignId: string, delayMs = 0): Promise<string | null> {
  const q = getCampaignQueue();
  if (!q) return null;
  const job = await q.add(
    "tick",
    { campaignId },
    {
      jobId: `campaign-${campaignId}-${Date.now()}`,
      delay: delayMs,
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );
  return job.id ?? null;
}

export function isCampaignQueueEnabled(): boolean {
  return isQueueEnabled();
}
