import "server-only";
import { Queue } from "bullmq";
import { getRedisConnection, isQueueEnabled } from "@/server/queue/redis";
import {
  INBOUND_QUEUE_NAME,
  type InboundJobData,
  type WebQrInboundJob,
  type WhatsAppInboundJob,
} from "@/server/queue/inbound-jobs";

let queue: Queue | null = null;

function getInboundQueue(): Queue | null {
  if (!isQueueEnabled()) return null;
  const connection = getRedisConnection();
  if (!connection) return null;
  if (!queue) {
    queue = new Queue(INBOUND_QUEUE_NAME, { connection });
  }
  return queue;
}

export async function enqueueWebQrInbound(payload: BridgeInboundPayload): Promise<boolean> {
  const q = getInboundQueue();
  if (!q) return false;
  const data: WebQrInboundJob = { kind: "web-qr", payload };
  await q.add("web-qr", data, {
    jobId: `web-qr-${payload.messageId}`,
    removeOnComplete: 2000,
    removeOnFail: 5000,
  });
  return true;
}

export async function enqueueWhatsAppInbound(input: Omit<WhatsAppInboundJob, "kind">): Promise<boolean> {
  const q = getInboundQueue();
  if (!q || !input.msg.id) return false;
  const data: WhatsAppInboundJob = { kind: "whatsapp", ...input };
  await q.add("whatsapp", data, {
    jobId: `whatsapp-${input.msg.id}`,
    removeOnComplete: 2000,
    removeOnFail: 5000,
  });
  return true;
}
