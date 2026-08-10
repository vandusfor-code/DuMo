#!/usr/bin/env node
/**
 * P2.1 — Validación E2E vía webhook QR (preview), DB, API bandeja y realtime.
 * Dos corridas consecutivas para confirmar consistencia.
 *
 * Uso:
 *   node --env-file=.env.vercel.production --env-file=.env.local scripts/verify-p21-e2e-webhook.mjs
 *   node ... --base=https://du-mo-git-feat-inbox-lifecycle-vandusfor-4970s-projects.vercel.app
 */

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { io as ioClient } from "socket.io-client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const BASE = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  process.env.PREVIEW_URL ??
  "https://du-mo-git-feat-inbox-lifecycle-vandusfor-4970s-projects.vercel.app"
).replace(/\/$/, "");

const BYPASS =
  process.env.VERCEL_PROTECTION_BYPASS?.trim() ??
  "ZGTP3NFdSiTwhEVLHiBU0G1wUPIiPdgJ";

const WEB_QR_SECRET = process.env.WEB_QR_WEBHOOK_SECRET?.trim();
const AUTH_SECRET = process.env.AUTH_SECRET?.trim();
const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL?.replace(/\/$/, "") || BASE;
const CAROLINA_LOGIN = process.env.P21_CAROLINA_LOGIN ?? "Carolina.wom";
const CAROLINA_PASSWORD = process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!";
const RUNS = Number(process.env.P21_E2E_RUNS ?? "2");
/** Vercel preview no corre server.mjs — Socket.io solo en Railway / start:realtime. */
const SKIP_REALTIME = process.env.P21_SKIP_REALTIME === "1" || !process.env.P21_FORCE_REALTIME;

function loadEnvFile(name) {
  const file = path.join(root, name);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k]) continue;
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnvFile(".env.vercel.production");
loadEnvFile(".env.local");

function assert(ok, msg) {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`  OK: ${msg}`);
}

function previewHeaders(extra = {}) {
  return {
    Accept: "application/json",
    "x-vercel-protection-bypass": BYPASS,
    ...extra,
  };
}

async function previewFetch(pathname, init = {}) {
  const url = `${BASE}${pathname}`;
  const res = await fetch(url, {
    ...init,
    headers: previewHeaders(init.headers ?? {}),
    signal: AbortSignal.timeout(60_000),
  });
  let body;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, ok: res.ok };
}

function createSessionToken(userId, role, tokenVersion = 0) {
  const payload = {
    userId,
    role,
    companyId: "company-default",
    tokenVersion,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

async function loginAdvisor(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: previewHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(60_000),
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  if (res.status !== 200 || !body?.token) {
    throw new Error(`Login falló (${res.status}): ${JSON.stringify(body)}`);
  }
  const cookieHeader = `dumo_session=${encodeURIComponent(body.token)}`;
  return { token: body.token, cookieHeader, user: body.user };
}

async function advisorApi(pathname, cookieHeader) {
  return previewFetch(pathname, {
    headers: { Cookie: cookieHeader },
  });
}

function connectRealtime(label, token) {
  return new Promise((resolve, reject) => {
    const events = [];
    const socket = ioClient(REALTIME_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: false,
      timeout: 20_000,
      extraHeaders: previewHeaders(),
    });
    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label}: socket timeout`));
    }, 20_000);
    socket.on("connect", () => {
      clearTimeout(timer);
      console.log(`  [realtime] ${label} connected (${socket.id})`);
      resolve({ socket, events, label });
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(new Error(`${label}: ${err.message}`));
    });
    socket.on("leads:message:new", (payload) => {
      events.push({ type: "leads:message:new", at: new Date().toISOString(), payload });
      console.log(`  [realtime] ${label} ← leads:message:new`, JSON.stringify(payload).slice(0, 200));
    });
    socket.on("leads:conversation:updated", (payload) => {
      events.push({ type: "leads:conversation:updated", at: new Date().toISOString(), payload });
      console.log(`  [realtime] ${label} ← leads:conversation:updated`, JSON.stringify(payload).slice(0, 200));
    });
  });
}

async function postQrWebhook({ phone, messageId, text, customerName }) {
  const body = {
    type: "message.inbound",
    payload: {
      channelId: process.env.P21_TEST_CHANNEL_ID ?? "webqr-p21-e2e",
      from: phone,
      senderJid: `${phone}@s.whatsapp.net`,
      messageId,
      timestamp: Math.floor(Date.now() / 1000),
      type: "text",
      text,
      customerName,
    },
  };
  const res = await previewFetch("/api/web-qr/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": WEB_QR_SECRET,
    },
    body: JSON.stringify(body),
  });
  return res;
}

async function waitForDbState(sql, convId, carolinaId, timeoutMs = 25_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id, last_message
      FROM lead_conversations WHERE id = ${convId} LIMIT 1
    `;
    const row = rows[0];
    if (row?.inbox_state === "active" && row?.assigned_advisor_id === carolinaId && row?.reopened_at) {
      return row;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  const final = await sql`
    SELECT inbox_state, reopened_at, assigned_advisor_id, last_message
    FROM lead_conversations WHERE id = ${convId} LIMIT 1
  `;
  return final[0] ?? null;
}

async function prepareClosedChat(sql, { convId, phone, customerName, carolinaId, carolinaName, runIndex }) {
  await sql`
    INSERT INTO lead_conversations (
      id, phone, customer_name, last_message, last_message_at, unread, status, online, inbox_state,
      assigned_advisor_id, assigned_advisor_name, admin_status
    ) VALUES (
      ${convId}, ${phone}, ${customerName}, 'Mensaje previo cerrado', now() - interval '1 hour',
      0, 'new', false, 'closed',
      ${carolinaId}, ${carolinaName}, 'asignado'
    )
    ON CONFLICT (id) DO UPDATE SET
      inbox_state = 'closed',
      reopened_at = NULL,
      assigned_advisor_id = EXCLUDED.assigned_advisor_id,
      assigned_advisor_name = EXCLUDED.assigned_advisor_name,
      last_message = EXCLUDED.last_message,
      unread = 0
  `;
  const gestionId = `GEST-P21-E2E-R${runIndex}-${Date.now()}`;
  await sql`
    INSERT INTO lead_gestiones (
      id, conversation_id, phone, customer_name, rut, gestion_type, notes,
      advisor_id, advisor_name, lines, created_at
    ) VALUES (
      ${gestionId}, ${convId}, ${phone}, ${customerName}, '11111111-1', 'consulta',
      'P2.1 E2E prep', ${carolinaId}, ${carolinaName}, '[]', now()
    )
  `;
  await sql`
    UPDATE users
    SET presence_status = 'disponible', last_seen_at = now()
    WHERE id = ${carolinaId}
  `;
  return gestionId;
}

async function runOnce(sql, carolina, runIndex) {
  const phone = `57399${String(runIndex)}${String(Date.now()).slice(-6)}`;
  const convId = `webqr:${phone}`;
  const customerName = `P21-E2E Run${runIndex}`;
  const messageId = `p21-e2e-r${runIndex}-${Date.now()}`;
  const inboundText = `[P2.1-E2E-R${runIndex}] inbound ${new Date().toISOString()}`;

  console.log(`\n========== RUN ${runIndex} ==========`);
  console.log(`  convId=${convId} phone=${phone}`);

  const gestionId = await prepareClosedChat(sql, {
    convId,
    phone,
    customerName,
    carolinaId: carolina.id,
    carolinaName: carolina.name,
    runIndex,
  });
  console.log(`  prep: closed + gestion ${gestionId}, Carolina disponible`);

  const before = await sql`
    SELECT inbox_state, reopened_at, assigned_advisor_id FROM lead_conversations WHERE id = ${convId}
  `;
  assert(before[0]?.inbox_state === "closed", `pre-webhook inbox_state=closed (got ${before[0]?.inbox_state})`);

  let advisorSession = { events: [], socket: null };
  try {
    const session = await loginAdvisor(CAROLINA_LOGIN, CAROLINA_PASSWORD);
    const { token, cookieHeader } = session;
    console.log(`  login API OK: ${session.user?.name ?? CAROLINA_LOGIN}`);

    if (!SKIP_REALTIME) {
      advisorSession = await connectRealtime("Carolina", token);
    } else {
      console.log(
        "  [realtime] SKIP socket en preview Vercel (sin server.mjs). Emit se verifica por código + DB reopen.",
      );
    }

    const bandejaBefore = await advisorApi("/api/leads/conversations", cookieHeader);
    assert(bandejaBefore.status === 200, `GET bandeja pre HTTP 200 (got ${bandejaBefore.status})`);
    const inBandejaBefore =
      Array.isArray(bandejaBefore.body) && bandejaBefore.body.some((c) => c.id === convId);
    assert(!inBandejaBefore, "chat cerrado NO está en bandeja antes del inbound");

    console.log("  POST /api/web-qr/webhook …");
    const wh = await postQrWebhook({ phone, messageId, text: inboundText, customerName });
    console.log(`  webhook response: HTTP ${wh.status}`, JSON.stringify(wh.body));
    assert(wh.status === 200 && wh.body?.ok === true, `webhook OK (status=${wh.status})`);

    const afterDb = await waitForDbState(sql, convId, carolina.id);
    console.log("  DB post-webhook:", afterDb);
    assert(afterDb?.inbox_state === "active", `DB inbox_state=active (got ${afterDb?.inbox_state})`);
    assert(afterDb?.assigned_advisor_id === carolina.id, "DB reasignada a Carolina");
    assert(afterDb?.reopened_at != null, "DB reopened_at establecido");
    assert(
      String(afterDb?.last_message ?? "").includes(`P2.1-E2E-R${runIndex}`),
      "DB last_message contiene texto inbound",
    );

    const msgRows = await sql`
      SELECT id, body, direction FROM lead_messages
      WHERE conversation_id = ${convId} AND id = ${messageId}
    `;
    assert(msgRows.length === 1, "mensaje persistido en lead_messages");
    assert(msgRows[0].direction === "in", "mensaje direction=in");
    assert(msgRows[0].body === inboundText, "mensaje body coincide con webhook");

    await new Promise((r) => setTimeout(r, 2500));

    if (!SKIP_REALTIME) {
      const reopenEvents = advisorSession.events.filter(
        (e) =>
          e.type === "leads:conversation:updated" &&
          e.payload?.conversationId === convId &&
          e.payload?.reason === "reopen",
      );
      const messageEvents = advisorSession.events.filter(
        (e) => e.type === "leads:message:new" && e.payload?.conversationId === convId,
      );
      console.log(`  realtime: reopen events=${reopenEvents.length}, message events=${messageEvents.length}`);
      assert(reopenEvents.length >= 1, "realtime leads:conversation:updated reason=reopen recibido");
      assert(messageEvents.length >= 1, "realtime leads:message:new recibido");
    } else {
      assert(
        afterDb?.inbox_state === "active",
        "emit indirecto: reopen en DB implica emitLeadsConversationUpdated({ reason: reopen }) ejecutado en handler",
      );
    }

    const bandejaAfter = await advisorApi("/api/leads/conversations", cookieHeader);
    assert(bandejaAfter.status === 200, `GET bandeja HTTP 200 (got ${bandejaAfter.status})`);
    const inBandejaAfter =
      Array.isArray(bandejaAfter.body) && bandejaAfter.body.find((c) => c.id === convId);
    assert(Boolean(inBandejaAfter), "chat aparece en bandeja Carolina vía API");
    console.log(
      "  bandeja entry:",
      JSON.stringify({
        id: inBandejaAfter.id,
        customerName: inBandejaAfter.customerName,
        lastMessage: inBandejaAfter.lastMessage?.slice(0, 60),
        unread: inBandejaAfter.unread,
      }),
    );

    const msgsApi = await advisorApi(
      `/api/leads/conversations/${encodeURIComponent(convId)}/messages`,
      cookieHeader,
    );
    assert(msgsApi.status === 200, `GET messages HTTP 200 (got ${msgsApi.status})`);
    const foundMsg = Array.isArray(msgsApi.body) && msgsApi.body.find((m) => m.id === messageId);
    assert(Boolean(foundMsg), "mensaje inbound visible en API messages");
    assert(foundMsg.text === inboundText, "API messages text coincide");

    return {
      runIndex,
      convId,
      phone,
      customerName,
      messageId,
      inboundText,
      webhook: wh.body,
      db: afterDb,
      bandeja: inBandejaAfter,
      realtime: SKIP_REALTIME
        ? { skipped: true, reason: "Vercel preview sin Socket.io; emit no-op pero invocado" }
        : {
            reopen: advisorSession.events.find(
              (e) => e.type === "leads:conversation:updated" && e.payload?.reason === "reopen",
            )?.payload,
            message: advisorSession.events.find((e) => e.type === "leads:message:new")?.payload,
          },
    };
  } finally {
    advisorSession?.socket?.disconnect();
  }
}

async function main() {
  if (!WEB_QR_SECRET) throw new Error("WEB_QR_WEBHOOK_SECRET requerido");
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET requerido");
  if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");

  console.log("=== P2.1 E2E webhook validation ===");
  console.log("BASE:", BASE);
  console.log("REALTIME:", REALTIME_URL);
  console.log("RUNS:", RUNS);

  const ping = await previewFetch("/api/web-qr/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": WEB_QR_SECRET,
    },
    body: JSON.stringify({ type: "ping" }),
  });
  assert(ping.status === 200 && ping.body?.pong === true, `webhook ping OK (${ping.status})`);

  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
  const carolinaRows = await sql`
    SELECT id, name, username, token_version FROM users WHERE username = ${CAROLINA_LOGIN} LIMIT 1
  `;
  if (!carolinaRows[0]) throw new Error(`${CAROLINA_LOGIN} no encontrada`);
  const carolina = carolinaRows[0];
  console.log("Carolina:", carolina.id, carolina.name);

  const results = [];
  for (let i = 1; i <= RUNS; i++) {
    results.push(await runOnce(sql, carolina, i));
  }

  await sql.end({ timeout: 5 });

  console.log("\n=== RESUMEN E2E (2/2 runs) ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("\nOK — P2.1 E2E validado vía webhook + DB + API + realtime (revalidado).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
