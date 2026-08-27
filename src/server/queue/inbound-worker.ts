import "server-only";
import { Worker } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import { INBOUND_QUEUE_NAME, type InboundJobData } from "@/server/queue/inbound-jobs";
import { persistWebQrInbound } from "@/server/web-qr/inbound";
import { persistWhatsAppInboundMessage } from "@/server/whatsapp/inbound-persist";

let worker: Worker<InboundJobData> | null = null;
let started = false;

export function ensureInboundMessageWorker(): void {
  if (started || !isQueueEnabled()) return;
  const connection = getRedisConnection();
  if (!connection) return;

  started = true;
  worker = new Worker<InboundJobData>(
    INBOUND_QUEUE_NAME,
    async (job) => {
      const data = job.data;
      if (data.kind === "web-qr") {
        await persistWebQrInbound(data.payload);
        return;
      }
      if (data.kind === "whatsapp") {
        await persistWhatsAppInboundMessage({
          msg: data.msg,
          phoneId: data.phoneId,
          customerName: data.customerName,
        });
      }
    },
    {
      connection,
      concurrency: 1,
    },
  );

  worker.on("failed", (job, err) => {
    console.error("[inbound-worker] job failed", job?.id, err);
  });

  worker.on("error", (err) => {
    console.error("[inbound-worker] error", err);
  });

  console.log("[inbound-worker] BullMQ consumer started (concurrency=1)");
}

export async function closeInboundMessageWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  started = false;
}
