#!/usr/bin/env node
/**
 * P2.2 — E2E round-robin fallback vía webhook QR (preview), DB y API bandeja.
 * Dos corridas: tipificador offline → otra asesora disponible recibe el chat.
 *
 * Uso:
 *   node --env-file=.env.vercel.production --env-file=.env.local scripts/verify-p22-e2e-webhook.mjs
 */

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

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
const CAROLINA_LOGIN = process.env.P21_CAROLINA_LOGIN ?? "Carolina.wom";
const CAROLINA_PASSWORD = process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!";
const RUNS = Number(process.env.P22_E2E_RUNS ?? "2");

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
  const res = await fetch(`${BASE}${pathname}`, {
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

function sessionCookie(userId, role, tokenVersion = 0) {
  const payload = {
    userId,
    role,
    companyId: "company-default",
    tokenVersion,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `dumo_session=${encodeURIComponent(`${body}.${sig}`)}`;
}

async function loginAdvisor(login, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: previewHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status !== 200 || !body?.token) {
    throw new Error(`Login ${login} falló (${res.status})`);
  }
  return { cookieHeader: `dumo_session=${encodeURIComponent(body.token)}`, user: body.user };
}

async function advisorApi(pathname, cookieHeader) {
  return previewFetch(pathname, { headers: { Cookie: cookieHeader } });
}

async function postQrWebhook({ phone, messageId, text, customerName }) {
  return previewFetch("/api/web-qr/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": WEB_QR_SECRET,
    },
    body: JSON.stringify({
      type: "message.inbound",
      payload: {
        channelId: process.env.P22_TEST_CHANNEL_ID ?? "webqr-p22-e2e",
        from: phone,
        senderJid: `${phone}@s.whatsapp.net`,
        messageId,
        timestamp: Math.floor(Date.now() / 1000),
        type: "text",
        text,
        customerName,
      },
    }),
  });
}

async function waitForAssignment(sql, convId, expectedAdvisorId, timeoutMs = 25_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const rows = await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id, last_message
      FROM lead_conversations WHERE id = ${convId} LIMIT 1
    `;
    const row = rows[0];
    if (
      row?.inbox_state === "active" &&
      row?.assigned_advisor_id === expectedAdvisorId &&
      row?.reopened_at
    ) {
      return row;
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return (
    await sql`
      SELECT inbox_state, reopened_at, assigned_advisor_id, last_message
      FROM lead_conversations WHERE id = ${convId} LIMIT 1
    `
  )[0];
}

async function prepareClosedTipifiedByCarolina(sql, opts) {
  const { convId, phone, customerName, carolinaId, carolinaName, runIndex } = opts;
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
      inbox_state = 'closed', reopened_at = NULL,
      assigned_advisor_id = EXCLUDED.assigned_advisor_id,
      assigned_advisor_name = EXCLUDED.assigned_advisor_name, unread = 0
  `;
  await sql`
    INSERT INTO lead_gestiones (
      id, conversation_id, phone, customer_name, rut, gestion_type, notes,
      advisor_id, advisor_name, lines, created_at
    ) VALUES (
      ${`GEST-P22-E2E-R${runIndex}-${Date.now()}`}, ${convId}, ${phone}, ${customerName},
      '11111111-1', 'consulta', 'P2.2 E2E', ${carolinaId}, ${carolinaName}, '[]', now()
    )
  `;
}

async function runOnce(sql, carolina, fallback, runIndex) {
  const phone = `57396${runIndex}${String(Date.now()).slice(-6)}`;
  const convId = `webqr:${phone}`;
  const customerName = `P22-E2E Run${runIndex}`;
  const messageId = `p22-e2e-r${runIndex}-${Date.now()}`;
  const inboundText = `[P2.2-E2E-R${runIndex}] inbound ${new Date().toISOString()}`;

  console.log(`\n========== RUN ${runIndex} ==========`);
  console.log(`  convId=${convId} fallback=${fallback.username} (${fallback.id})`);

  await prepareClosedTipifiedByCarolina(sql, {
    convId,
    phone,
    customerName,
    carolinaId: carolina.id,
    carolinaName: carolina.name,
    runIndex,
  });

  await sql`
    UPDATE users SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
    WHERE role = 'asesora' AND active = true
  `;
  await sql`
    UPDATE users SET presence_status = 'disponible', last_seen_at = now()
    WHERE id = ${fallback.id}
  `;

  const presenceCheck = await sql`
    SELECT id, username, presence_status, last_seen_at FROM users
    WHERE role = 'asesora' AND active = true
      AND presence_status = 'disponible'
      AND last_seen_at > now() - interval '10 minutes'
  `;
  assert(
    presenceCheck.length === 1 && presenceCheck[0].id === fallback.id,
    `solo fallback disponible online (got ${presenceCheck.map((r) => r.username).join(", ")})`,
  );

  const carolinaSession = await loginAdvisor(CAROLINA_LOGIN, CAROLINA_PASSWORD);
  const fallbackCookie = sessionCookie(fallback.id, "asesora", fallback.token_version ?? 0);

  const carolinaBefore = await advisorApi("/api/leads/conversations", carolinaSession.cookieHeader);
  assert(carolinaBefore.status === 200, "Carolina bandeja pre HTTP 200");
  assert(
    !(Array.isArray(carolinaBefore.body) && carolinaBefore.body.some((c) => c.id === convId)),
    "Carolina NO ve chat cerrado pre-inbound",
  );

  const fallbackBefore = await advisorApi("/api/leads/conversations", fallbackCookie);
  assert(fallbackBefore.status === 200, "fallback bandeja pre HTTP 200");
  assert(
    !(Array.isArray(fallbackBefore.body) && fallbackBefore.body.some((c) => c.id === convId)),
    "fallback NO ve chat pre-inbound",
  );

  console.log("  POST /api/web-qr/webhook …");
  await sql`
    UPDATE users SET presence_status = 'desconectado', last_seen_at = now() - interval '15 minutes'
    WHERE role = 'asesora' AND active = true AND id <> ${fallback.id}
  `;
  await sql`
    UPDATE users SET presence_status = 'disponible', last_seen_at = now() WHERE id = ${fallback.id}
  `;
  const wh = await postQrWebhook({ phone, messageId, text: inboundText, customerName });
  console.log(`  webhook: HTTP ${wh.status}`, JSON.stringify(wh.body));
  assert(wh.status === 200 && wh.body?.ok === true, "webhook OK");

  const afterDb = await waitForAssignment(sql, convId, fallback.id);
  console.log("  DB post-webhook:", afterDb);
  assert(afterDb?.inbox_state === "active", `DB active (got ${afterDb?.inbox_state})`);
  assert(afterDb?.assigned_advisor_id === fallback.id, "DB asignada a fallback (round-robin)");
  assert(afterDb?.assigned_advisor_id !== carolina.id, "DB NO asignada a Carolina (offline)");
  assert(afterDb?.reopened_at != null, "DB reopened_at set");
  assert(String(afterDb?.last_message ?? "").includes(`P2.2-E2E-R${runIndex}`), "DB last_message OK");

  const msgRow = await sql`
    SELECT id, body FROM lead_messages WHERE id = ${messageId} AND conversation_id = ${convId}
  `;
  assert(msgRow.length === 1, "mensaje en lead_messages");
  assert(msgRow[0].body === inboundText, "body mensaje coincide");

  const fallbackAfter = await advisorApi("/api/leads/conversations", fallbackCookie);
  assert(fallbackAfter.status === 200, "fallback bandeja post HTTP 200");
  const inFallback = Array.isArray(fallbackAfter.body)
    ? fallbackAfter.body.find((c) => c.id === convId)
    : null;
  assert(Boolean(inFallback), "chat en bandeja fallback vía API");
  assert(inFallback.inboxState === "active", "bandeja fallback inboxState=active");
  console.log("  fallback bandeja:", JSON.stringify({
    id: inFallback.id,
    customerName: inFallback.customerName,
    lastMessage: inFallback.lastMessage?.slice(0, 50),
    unread: inFallback.unread,
  }));

  const carolinaAfter = await advisorApi("/api/leads/conversations", carolinaSession.cookieHeader);
  assert(
    !(Array.isArray(carolinaAfter.body) && carolinaAfter.body.some((c) => c.id === convId)),
    "Carolina NO ve chat tras round-robin",
  );

  const msgsApi = await advisorApi(
    `/api/leads/conversations/${encodeURIComponent(convId)}/messages`,
    fallbackCookie,
  );
  assert(msgsApi.status === 200, "GET messages HTTP 200");
  const found = Array.isArray(msgsApi.body) && msgsApi.body.find((m) => m.id === messageId);
  assert(Boolean(found), "mensaje visible para fallback");
  assert(found.text === inboundText, "API messages text OK");

  return {
    runIndex,
    convId,
    phone,
    messageId,
    inboundText,
    assignedTo: fallback.username,
    db: afterDb,
    fallbackBandeja: inFallback,
  };
}

async function main() {
  if (!WEB_QR_SECRET || !AUTH_SECRET || !DATABASE_URL) {
    throw new Error("WEB_QR_WEBHOOK_SECRET, AUTH_SECRET y DATABASE_URL1 requeridos");
  }

  console.log("=== P2.2 E2E round-robin fallback ===");
  console.log("BASE:", BASE);

  const ping = await previewFetch("/api/web-qr/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-web-qr-webhook-secret": WEB_QR_SECRET,
    },
    body: JSON.stringify({ type: "ping" }),
  });
  assert(ping.status === 200 && ping.body?.pong === true, "webhook ping OK");

  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  const carolinaRows = await sql`
    SELECT id, name, username FROM users WHERE username = ${CAROLINA_LOGIN} LIMIT 1
  `;
  if (!carolinaRows[0]) throw new Error("Carolina no encontrada");
  const carolina = carolinaRows[0];

  const fallbackRows = await sql`
    SELECT id, name, username, token_version FROM users
    WHERE role = 'asesora' AND active = true AND id <> ${carolina.id}
    ORDER BY username LIMIT 1
  `;
  if (!fallbackRows[0]) throw new Error("No hay asesora fallback");
  const fallback = fallbackRows[0];

  console.log("Tipificador (offline en test):", carolina.username, carolina.id);
  console.log("Fallback (disponible en test):", fallback.username, fallback.id);

  const results = [];
  try {
    for (let i = 1; i <= RUNS; i++) {
      results.push(await runOnce(sql, carolina, fallback, i));
    }
  } finally {
    await sql`
      UPDATE users SET presence_status = 'disponible', last_seen_at = now()
      WHERE id IN (${carolina.id}, ${fallback.id})
    `;
    await sql.end({ timeout: 5 });
  }

  console.log("\n=== RESUMEN P2.2 E2E ===");
  console.log(JSON.stringify(results, null, 2));
  console.log("\nOK — P2.2 round-robin E2E (2/2) vía webhook + DB + API.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
