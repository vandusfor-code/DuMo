export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureInboundMessageWorker } = await import("@/server/queue/inbound-worker");
    ensureInboundMessageWorker();
  }
}
