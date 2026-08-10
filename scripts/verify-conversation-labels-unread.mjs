#!/usr/bin/env node
/**
 * Verifica etiquetas de tipificación en bandeja + reset de no leídos al abrir chat.
 * Uso: node --env-file=.env.local scripts/verify-conversation-labels-unread.mjs --base=http://localhost:3000
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scryptSync, randomBytes } from "node:crypto";
import postgres from "postgres";

const VERIFY_NOTE = "verify labels unread E2E";
const TEMP_PASSWORD = "P15TestLocal!2026";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const name of [".env.local", ".env.production.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim();
  }
}

const base = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  "http://localhost:3000"
).replace(/\/$/, "");

const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();
if (!DATABASE_URL) throw new Error("DATABASE_URL requerido");

function parseCookie(setCookie) {
  const m = (setCookie ?? "").match(/dumo_session=([^;]+)/);
  return m ? `dumo_session=${m[1]}` : null;
}

async function login(login, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(45_000),
  });
  const cookie = parseCookie(res.headers.get("set-cookie"));
  if (!res.ok || !cookie) throw new Error(`Login ${login} falló: ${res.status}`);
  return cookie;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

let restorePasswordHash = null;
let restoreUserId = null;

async function ensureCarolinaLogin() {
  const password = process.env.P21_CAROLINA_PASSWORD ?? TEMP_PASSWORD;
  try {
    return await login("Carolina.wom", password);
  } catch {
    const [row] = await sql`SELECT id, password_hash FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1`;
    if (!row) throw new Error("Carolina.wom no encontrada");
    restorePasswordHash = row.password_hash;
    restoreUserId = row.id;
    await sql`UPDATE users SET password_hash = ${hashPassword(TEMP_PASSWORD)} WHERE id = ${row.id}`;
    return login("Carolina.wom", TEMP_PASSWORD);
  }
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
const failures = [];
let cleanupConvId = null;

try {
  console.log("=== verify — tipificación en lista + unread reset ===");
  console.log("Base:", base);

  const cookie = await ensureCarolinaLogin();

  const [carolina] = await sql`SELECT id FROM users WHERE username ILIKE 'Carolina.wom'`;
  const [conv] = await sql`
    SELECT id, phone, customer_name, unread FROM lead_conversations
    WHERE assigned_advisor_id = ${carolina.id} AND inbox_state = 'active'
    ORDER BY last_message_at DESC LIMIT 1
  `;
  if (!conv) throw new Error("No hay chat activo para prueba");
  cleanupConvId = conv.id;

  await sql`
    UPDATE lead_conversations SET unread = 3 WHERE id = ${conv.id}
  `;
  await sql`
    UPDATE lead_messages SET read = false
    WHERE conversation_id = ${conv.id} AND direction = 'in'
  `;

  const before = await fetch(`${base}/api/leads/conversations`, {
    headers: { Cookie: cookie },
  });
  const beforeList = await before.json();
  const rowBefore = beforeList.find((c) => c.id === conv.id);
  console.log("\n--- unread before open ---");
  console.log("  unread:", rowBefore?.unread);
  if ((rowBefore?.unread ?? 0) < 1) failures.push("unread not seeded");

  console.log("\n--- mark read via POST /read ---");
  const readRes = await fetch(
    `${base}/api/leads/conversations/${encodeURIComponent(conv.id)}/read`,
    { method: "POST", headers: { Cookie: cookie } },
  );
  console.log("  POST read:", readRes.status);
  if (readRes.status !== 200) failures.push("POST read status");

  const after = await fetch(`${base}/api/leads/conversations`, {
    headers: { Cookie: cookie },
  });
  const afterList = await after.json();
  const rowAfter = afterList.find((c) => c.id === conv.id);
  console.log("  unread after:", rowAfter?.unread);
  if ((rowAfter?.unread ?? 1) !== 0) failures.push("unread not zero after read");

  const [{ cnt }] = await sql`
    SELECT COUNT(*)::int AS cnt FROM lead_messages
    WHERE conversation_id = ${conv.id} AND direction = 'in' AND read = false
  `;
  console.log("  unread inbound messages in DB:", cnt);
  if (cnt !== 0) failures.push("messages still unread in DB");

  console.log("\n--- tipificación label after save ---");
  const adminCookie = await login(
    process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos",
    process.env.PROD_ADMIN_PASSWORD ?? "100299",
  );
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 4);
  const saveRes = await fetch(`${base}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      conversationId: conv.id,
      phone: conv.phone,
      customerName: conv.customer_name,
      rut: "12.345.678-9",
      type: "consulta",
      notes: VERIFY_NOTE,
      saveAction: "close",
    }),
    signal: AbortSignal.timeout(90_000),
  });
  console.log("  POST consulta:", saveRes.status);
  if (saveRes.status !== 201) failures.push("save gestion failed");

  const labeled = await fetch(`${base}/api/admin/leads`, {
    headers: { Cookie: adminCookie },
  });
  const labeledList = await labeled.json();
  const rowLabeled = labeledList.find((c) => c.id === conv.id);
  console.log("  latestTipification (admin list):", rowLabeled?.latestTipification);
  if (!rowLabeled?.latestTipification?.slug) failures.push("missing latestTipification");
  if (rowLabeled?.latestTipification?.slug !== "consulta") failures.push("wrong tipification slug");

  if (failures.length) {
    console.error("\nFALLOS:", failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("\nOK — labels + unread verificado.");
  }
} finally {
  if (cleanupConvId) {
    await sql`DELETE FROM lead_gestiones WHERE notes = ${VERIFY_NOTE}`;
    await sql`UPDATE lead_conversations SET unread = 0 WHERE id = ${cleanupConvId}`;
  }
  if (restoreUserId && restorePasswordHash) {
    await sql`UPDATE users SET password_hash = ${restorePasswordHash} WHERE id = ${restoreUserId}`;
  }
  await sql.end({ timeout: 5 });
}

if (process.exitCode) process.exit(process.exitCode);
