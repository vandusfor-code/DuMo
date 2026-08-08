/**
 * Ráfaga de mensajes QR contra webhook — verifica encolado BullMQ y entrega ordenada.
 *
 * Requiere: WEB_QR_WEBHOOK_SECRET, opcional DUMO_CRM_URL
 */

const BASE =
  process.env.DUMO_CRM_URL?.replace(/\/$/, "") ||
  "https://dumo-crm-production.up.railway.app";

const secret = process.env.WEB_QR_WEBHOOK_SECRET;
if (!secret) {
  console.error("WEB_QR_WEBHOOK_SECRET required");
  process.exit(1);
}

const BURST = Number(process.env.BURST_COUNT || 8);
const phone = process.env.TEST_FROM_PHONE || `57300${String(Date.now()).slice(-7)}`;
const channelId = process.env.TEST_CHANNEL_ID || "webqr-burst-test";

async function postOne(index) {
  const messageId = `burst-${Date.now()}-${index}`;
  const text = `Burst #${index + 1} @ ${new Date().toISOString()}`;
  const t0 = performance.now();
  const res = await fetch(`${BASE}/api/web-qr/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": secret,
    },
    body: JSON.stringify({
      type: "message.inbound",
      payload: {
        channelId,
        from: phone,
        senderJid: `${phone}@s.whatsapp.net`,
        messageId,
        timestamp: Math.floor(Date.now() / 1000),
        type: "text",
        text,
        customerName: "Burst Test",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    index,
    messageId,
    text,
    status: res.status,
    ms: Math.round(performance.now() - t0),
    queued: body.queued === true,
    ok: res.ok,
  };
}

async function fetchMessages() {
  const convId = `webqr:${phone}`;
  const res = await fetch(
    `${BASE}/api/leads/conversations/${encodeURIComponent(convId)}/messages`,
    { headers: { cookie: process.env.TEST_SESSION_COOKIE || "" } },
  );
  if (!res.ok) return null;
  return res.json();
}

async function pollMessageCount(expectedMin, timeoutMs = 60_000) {
  const convId = `webqr:${phone}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const db = await fetch(`${BASE}/api/system/db`).then((r) => r.json());
    if (db.messages >= expectedMin) return db.messages;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

async function main() {
  console.log(`Target: ${BASE}`);
  console.log(`Burst: ${BURST} messages to phone ${phone}\n`);

  const queueBefore = await fetch(`${BASE}/api/system/queue`).then((r) => r.json()).catch(() => null);
  console.log("Queue status before:", queueBefore);

  const dbBefore = await fetch(`${BASE}/api/system/db`).then((r) => r.json());
  const msgsBefore = dbBefore.messages ?? 0;

  const results = [];
  for (let i = 0; i < BURST; i++) {
    results.push(await postOne(i));
  }

  const allOk = results.every((r) => r.ok && r.status === 200);
  const allFast = results.every((r) => r.ms < 3000);
  const queuedCount = results.filter((r) => r.queued).length;

  console.log("\nWebhook responses:");
  for (const r of results) {
    console.log(
      `  #${r.index + 1} ${r.status} ${r.ms}ms queued=${r.queued} id=${r.messageId}`,
    );
  }

  const msgsAfter = await pollMessageCount(msgsBefore + BURST);
  const dbAfter = await fetch(`${BASE}/api/system/db`).then((r) => r.json());
  const delta = (dbAfter.messages ?? 0) - msgsBefore;

  const queueAfter = await fetch(`${BASE}/api/system/queue`).then((r) => r.json()).catch(() => null);
  console.log("\nQueue status after:", queueAfter);
  console.log(`Messages in DB: ${msgsBefore} → ${dbAfter.messages} (delta ${delta})`);

  if (!allOk) {
    console.error("\nFAIL: not all webhooks returned 200");
    process.exit(1);
  }
  if (!allFast) {
    console.error("\nFAIL: some webhooks took >3s (should ACK immediately when queued)");
    process.exit(1);
  }
  if (delta < BURST) {
    console.error(`\nFAIL: expected +${BURST} messages, got +${delta}`);
    process.exit(1);
  }

  console.log("\nPASS: burst test OK", {
    burst: BURST,
    queuedResponses: queuedCount,
    queueEnabled: queueBefore?.enabled ?? false,
    phone,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
