import "server-only";
import { Queue } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import {
  PCS_VALIDATION_QUEUE_NAME,
  type PcsValidationJobData,
} from "@/server/queue/pcs-validation-jobs";

let queue: Queue<PcsValidationJobData> | null = null;

function getPcsValidationQueue(): Queue<PcsValidationJobData> | null {
  if (!isQueueEnabled()) return null;
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue<PcsValidationJobData>(PCS_VALIDATION_QUEUE_NAME, { connection });
    queue.on("error", (err) => console.error("[pcs-validation-queue] error", err));
  }
  return queue;
}

/** Encola el job de validación PCS. Devuelve false si no hay Redis configurado. */
export async function enqueuePcsValidationJob(data: PcsValidationJobData): Promise<boolean> {
  const q = getPcsValidationQueue();
  if (!q) return false;
  await q.add("validate", data, {
    jobId: data.jobId,
    removeOnComplete: 100,
    removeOnFail: 100,
  });
  return true;
}
