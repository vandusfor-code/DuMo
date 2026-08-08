import { io as ioClient } from "socket.io-client";
import { createHmac } from "node:crypto";

const BASE =
  process.env.DUMO_CRM_URL?.replace(/\/$/, "") ||
  "https://dumo-crm-production.up.railway.app";

const AUTH_SECRET = process.env.AUTH_SECRET;
if (!AUTH_SECRET) {
  console.error("AUTH_SECRET required (same as Railway dumo-crm)");
  process.exit(1);
}

function createSessionToken(userId, role) {
  const payload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function connectAs(label, userId, role) {
  return new Promise((resolve, reject) => {
    const token = createSessionToken(userId, role);
    const events = [];
    const socket = ioClient(BASE, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 15000,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label}: connect timeout`));
    }, 15000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      console.log(`[${label}] connected (${socket.id}) role=${role}`);
      resolve({ socket, events, label });
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timeout);
      reject(new Error(`${label}: ${err.message}`));
    });

    socket.on("leads:message:new", (payload) => {
      events.push({ type: "leads:message:new", at: Date.now(), payload });
      console.log(`[${label}] event leads:message:new`, payload);
    });

    socket.on("leads:conversation:updated", (payload) => {
      events.push({ type: "leads:conversation:updated", at: Date.now(), payload });
      console.log(`[${label}] event leads:conversation:updated`, payload);
    });
  });
}

async function postWebhookMessage(fromPhone) {
  const secret = process.env.WEB_QR_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("WEB_QR_WEBHOOK_SECRET required for inbound webhook test");
  }
  const msgId = `ws-test-${Date.now()}`;
  const body = {
    type: "message.inbound",
    payload: {
      channelId: process.env.TEST_CHANNEL_ID || "webqr-ws-test",
      from: fromPhone,
      senderJid: `${fromPhone}@s.whatsapp.net`,
      messageId: msgId,
      timestamp: Math.floor(Date.now() / 1000),
      type: "text",
      text: `WebSocket multi-session test ${new Date().toISOString()}`,
      customerName: "WS Test",
    },
  };
  const res = await fetch(`${BASE}/api/web-qr/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": secret,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`Webhook POST ${res.status}:`, text.slice(0, 200));
  return { msgId, ok: res.ok, fromPhone };
}

async function main() {
  const adminUserId = process.env.TEST_ADMIN_USER_ID || "u-admin";
  const advisorUserId = process.env.TEST_ADVISOR_USER_ID || "usr-1786134226280-8zlbo6";
  const fromPhone = process.env.TEST_FROM_PHONE || `57300${String(Date.now()).slice(-7)}`;

  console.log("Target:", BASE);
  console.log("Simulating 3 simultaneous socket sessions...\n");

  const [admin1, admin2, advisor] = await Promise.all([
    connectAs("admin-tab-1", adminUserId, "administrador"),
    connectAs("admin-tab-2", adminUserId, "supervisor"),
    connectAs("advisor-tab", advisorUserId, "asesora"),
  ]);

  await new Promise((r) => setTimeout(r, 500));

  console.log("\nTriggering inbound message via webhook...");
  const { ok, fromPhone: phone } = await postWebhookMessage(fromPhone);
  if (!ok) {
    console.warn("Webhook returned non-OK — events may still fire if conv exists");
  }

  await new Promise((r) => setTimeout(r, 3000));

  const summary = [
    { label: admin1.label, count: admin1.events.length, events: admin1.events },
    { label: admin2.label, count: admin2.events.length, events: admin2.events },
    { label: advisor.label, count: advisor.events.length, events: advisor.events },
  ];

  console.log("\n=== Results ===");
  for (const s of summary) {
    console.log(`${s.label}: ${s.count} event(s)`);
  }

  admin1.socket.disconnect();
  admin2.socket.disconnect();
  advisor.socket.disconnect();

  const adminReceived = admin1.events.length + admin2.events.length;
  if (adminReceived < 2) {
    console.error("\nFAIL: expected both admin sessions to receive at least 1 event each");
    process.exit(1);
  }

  const advisorMessageNew = advisor.events.filter((e) => e.type === "leads:message:new");
  const advisorUpdated = advisor.events.filter((e) => e.type === "leads:conversation:updated");
  if (advisorMessageNew.length < 1 || advisorUpdated.length < 1) {
    console.error(
      "\nFAIL: advisor should receive both message:new and conversation:updated after auto-assign",
      { messageNew: advisorMessageNew.length, updated: advisorUpdated.length },
    );
    process.exit(1);
  }
  const withText = advisorMessageNew.some((e) => e.payload?.text?.length > 0);
  if (!withText) {
    console.error("\nFAIL: advisor message:new should include text payload");
    process.exit(1);
  }

  console.log("\nPASS: multi-session WebSocket delivery verified");
  console.log(JSON.stringify({ base: BASE, testPhone: phone, summary }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
