import "server-only";
import { Worker } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import { SLA_QUEUE_NAME, type SlaCheckJob } from "@/server/queue/sla-jobs";
import { reconcileConversationTimer } from "@/services/response-sla.service";

let worker: Worker<SlaCheckJob> | null = null;
let started = false;

export function ensureSlaWorker(): void {
  if (started || !isQueueEnabled()) return;
  const connection = getRedisConnection();
  if (!connection) return;

  started = true;
  worker = new Worker<SlaCheckJob>(
    SLA_QUEUE_NAME,
    async (job) => {
      await reconcileConversationTimer(job.data.conversationId);
    },
    { connection, concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    console.error("[sla-worker] job failed", job?.id, err);
  });

  worker.on("error", (err) => {
    console.error("[sla-worker] error", err);
  });

  console.log("[sla-worker] BullMQ consumer started (concurrency=5)");
}

export async function closeSlaWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  started = false;
}
