import { NextResponse } from "next/server";
import { isQueueEnabled } from "@/server/queue/redis";
import { INBOUND_QUEUE_NAME } from "@/server/queue/inbound-jobs";
import { Queue } from "bullmq";
import { getRedisConnection } from "@/server/queue/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = isQueueEnabled();
  if (!enabled) {
    return NextResponse.json({
      enabled: false,
      queue: INBOUND_QUEUE_NAME,
      message: "REDIS_URL no configurada — procesamiento inline en webhook",
    });
  }

  const connection = getRedisConnection();
  if (!connection) {
    return NextResponse.json({ enabled: true, connected: false });
  }

  try {
    const queue = new Queue(INBOUND_QUEUE_NAME, { connection });
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
    );
    await queue.close();
    return NextResponse.json({
      enabled: true,
      connected: true,
      queue: INBOUND_QUEUE_NAME,
      counts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ enabled: true, connected: false, error: message }, { status: 503 });
  }
}
