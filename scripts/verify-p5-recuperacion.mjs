#!/usr/bin/env node
/**
 * P5 — Verifica módulo Recuperación asesora + exclusión de Leads normal.
 * Uso: node --env-file=.env.local scripts/verify-p5-recuperacion.mjs --base=http://localhost:3000
 *
 * Crea datos de prueba marcados, los limpia al final (incluso si falla).
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scryptSync, randomBytes } from "node:crypto";
import postgres from "postgres";

const VERIFY_NOTE = "P5 verify recuperacion E2E";
const TEMP_TARGET_PASSWORD = "P5VerifyTemp!2026";
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

async function setTempTargetPassword(userId) {
  const [row] = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`;
  if (!row) throw new Error("Target user not found for temp password");
  cleanup.targetPasswordHash = row.password_hash;
  cleanup.targetUserId = userId;
  await sql`UPDATE users SET password_hash = ${hashPassword(TEMP_TARGET_PASSWORD)} WHERE id = ${userId}`;
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
const failures = [];
const cleanup = {
  conversationId: null,
  followUpId: null,
  originalAdvisorId: null,
  originalInboxState: null,
  targetUserId: null,
  targetPasswordHash: null,
};

async function runCleanup() {
  console.log("\n--- Limpieza datos P5 verify ---");
  const gestiones = await sql`
    SELECT id, conversation_id FROM lead_gestiones WHERE notes = ${VERIFY_NOTE}
  `;
  for (const g of gestiones) {
    await sql`DELETE FROM lead_follow_ups WHERE gestion_id = ${g.id} OR id = ${g.id}`;
    await sql`DELETE FROM lead_gestiones WHERE id = ${g.id}`;
    console.log("  deleted gestion/follow_up:", g.id);
  }
  if (cleanup.conversationId && cleanup.originalAdvisorId) {
    await sql`
      UPDATE lead_conversations
      SET assigned_advisor_id = ${cleanup.originalAdvisorId},
          inbox_state = ${cleanup.originalInboxState ?? "closed"}
      WHERE id = ${cleanup.conversationId}
    `;
    console.log("  restored conversation:", cleanup.conversationId);
  }
  if (cleanup.targetUserId && cleanup.targetPasswordHash) {
    await sql`
      UPDATE users SET password_hash = ${cleanup.targetPasswordHash} WHERE id = ${cleanup.targetUserId}
    `;
    console.log("  restored target advisor password:", cleanup.targetUserId);
  }
}

try {
  console.log("=== P5 verify — Recuperación asesora ===");
  console.log("Base:", base);

  const adminCookie = await login(
    process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos",
    process.env.PROD_ADMIN_PASSWORD ?? "100299",
  );

  const carolinaCookie = await login(
    "Carolina.wom",
    process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!",
  );

  const [carolina] = await sql`SELECT id FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1`;
  const [conv] = await sql`
    SELECT id, phone, customer_name, assigned_advisor_id, inbox_state
    FROM lead_conversations
    WHERE assigned_advisor_id = ${carolina.id} AND inbox_state = 'active'
    ORDER BY last_message_at DESC LIMIT 1
  `;
  if (!conv) throw new Error("No hay chat activo de Carolina para seed");
  cleanup.conversationId = conv.id;
  cleanup.originalAdvisorId = conv.assigned_advisor_id;
  cleanup.originalInboxState = conv.inbox_state;

  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + 7);
  const isoDate = followUpDate.toISOString().slice(0, 10);

  console.log("\n--- 1) Seed pendiente de prueba ---");
  const seedRes = await fetch(`${base}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: carolinaCookie },
    body: JSON.stringify({
      conversationId: conv.id,
      phone: conv.phone,
      customerName: conv.customer_name || "P5 verify",
      rut: "12.345.678-9",
      type: "seguimiento",
      notes: VERIFY_NOTE,
      saveAction: "close",
      followUpDate: isoDate,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  const seedBody = await seedRes.json().catch(() => ({}));
  console.log("  POST leads:", seedRes.status, "followUpCreated:", seedBody.followUpCreated);
  if (!seedBody.followUpCreated) failures.push("seed followUpCreated");

  const [followUpRow] = await sql`
    SELECT id FROM lead_follow_ups
    WHERE conversation_id = ${conv.id}
      AND module = 'pendientes'
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const pendienteId = followUpRow?.id;
  if (!pendienteId) failures.push("pendiente row not in DB after seed");
  else {
    cleanup.followUpId = pendienteId;
    console.log("  pendiente id:", pendienteId);
  }

  const listAdmin = await fetch(`${base}/api/admin/pendientes?page=1&pageSize=50`, {
    headers: { Cookie: adminCookie },
  });
  const adminBody = await listAdmin.json();
  const pendiente = adminBody.rows?.find((r) => r.id === pendienteId);
  if (!pendiente && pendienteId) failures.push("pendiente not in admin API list");
  else if (pendiente) console.log("  admin API row ok:", pendiente.customerName);

  const targetLoginFilter = process.env.P5_TARGET_ADVISOR_LOGIN?.trim();
  const [targetAdvisor] = targetLoginFilter
    ? await sql`
        SELECT id, username, name FROM users
        WHERE role = 'asesora' AND active = true AND username ILIKE ${targetLoginFilter}
        LIMIT 1
      `
    : await sql`
        SELECT id, username, name FROM users
        WHERE role = 'asesora' AND active = true AND presence_status = 'disponible'
          AND id <> ${carolina.id}
        ORDER BY CASE WHEN username ILIKE '%monica%' THEN 0 ELSE 1 END, name
        LIMIT 1
      `;
  if (!targetAdvisor) failures.push("no target advisor");
  else console.log("  target advisor:", targetAdvisor.username);

  if (pendienteId && targetAdvisor) {
    console.log("\n--- 2) Admin transfiere a asesora ---");
    const patchRes = await fetch(`${base}/api/admin/pendientes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        action: "transfer",
        id: pendienteId,
        advisorId: targetAdvisor.id,
      }),
    });
    const patchBody = await patchRes.json().catch(() => ({}));
    console.log("  PATCH transfer:", patchRes.status, patchBody);
    if (patchRes.status !== 200) failures.push("transfer HTTP");

    const targetPassword =
      process.env.P5_TARGET_ADVISOR_PASSWORD ?? TEMP_TARGET_PASSWORD;
    if (!process.env.P5_TARGET_ADVISOR_PASSWORD) {
      await setTempTargetPassword(targetAdvisor.id);
    }
    const targetCookie = await login(targetAdvisor.username, targetPassword);

    console.log("\n--- 3) NO aparece en Leads normal ---");
    const leadsRes = await fetch(`${base}/api/leads/conversations`, {
      headers: { Cookie: targetCookie },
    });
    const leads = await leadsRes.json();
    const inLeads = Array.isArray(leads) && leads.some((c) => c.id === conv.id);
    console.log("  GET conversations:", leadsRes.status, "inLeads:", inLeads);
    if (inLeads) failures.push("chat visible in normal Leads");

    console.log("\n--- 4) SÍ aparece en Recuperación ---");
    const recRes = await fetch(`${base}/api/dashboard/recuperacion?page=1&pageSize=20`, {
      headers: { Cookie: targetCookie },
    });
    const recBody = await recRes.json();
    const recRow = recBody.rows?.find((r) => r.conversationId === conv.id);
    console.log("  GET recuperacion:", recRes.status, "total:", recBody.total, "found:", Boolean(recRow));
    console.log("  summary:", recBody.summary);
    if (!recRow) failures.push("not in recuperacion list");

    console.log("\n--- 5) Tipificar y cerrar desde recuperación ---");
    const closeRes = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: targetCookie },
      body: JSON.stringify({
        conversationId: conv.id,
        phone: conv.phone,
        customerName: conv.customer_name || "P5 verify",
        rut: "12.345.678-9",
        type: "consulta",
        notes: VERIFY_NOTE,
        saveAction: "close",
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const closeBody = await closeRes.json().catch(() => ({}));
    console.log("  POST close consulta:", closeRes.status, closeBody.inboxState ?? closeBody);

    const rec2 = await fetch(`${base}/api/dashboard/recuperacion?page=1&pageSize=20`, {
      headers: { Cookie: targetCookie },
    });
    const recBody2 = await rec2.json();
    const stillThere = recBody2.rows?.some((r) => r.conversationId === conv.id);
    console.log("  recuperacion after close:", rec2.status, "stillThere:", stillThere);
    if (stillThere) failures.push("still in recuperacion after close");

    const [fu] = await sql`
      SELECT status, module FROM lead_follow_ups WHERE id = ${pendienteId}
    `;
    console.log("  follow_up state:", fu);
    if (fu?.status !== "completed") failures.push("follow_up not completed");
  }

  if (failures.length) {
    console.error("\nFALLOS P5:", failures.join("; "));
    process.exitCode = 1;
  } else {
    console.log("\nOK — P5 recuperación verificado.");
  }
} finally {
  try {
    await runCleanup();
  } catch (err) {
    console.error("Cleanup error:", err);
  }
  await sql.end({ timeout: 5 });
}

if (process.exitCode) process.exit(process.exitCode);
