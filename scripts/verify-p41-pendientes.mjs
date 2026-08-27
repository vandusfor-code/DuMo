#!/usr/bin/env node
/**
 * P4.1 + P4.2 — Verifica GET /api/admin/pendientes y transferencia.
 * Uso: node --env-file=.env.local scripts/verify-p41-pendientes.mjs --base=https://du-mo.vercel.app
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

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

async function adminLogin() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      login: process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos",
      password: process.env.PROD_ADMIN_PASSWORD ?? "100299",
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const data = await res.json().catch(() => ({}));
  const cookie = parseCookie(res.headers.get("set-cookie"));
  if (!res.ok || !cookie) throw new Error(`Admin login falló: ${res.status}`);
  return cookie;
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
const failures = [];

try {
  console.log("=== P4.1 verify — GET /api/admin/pendientes ===");
  console.log("Base:", base);

  const cookie = await adminLogin();

  const listRes = await fetch(`${base}/api/admin/pendientes?page=1&pageSize=10`, {
    headers: { Accept: "application/json", Cookie: cookie },
    cache: "no-store",
  });
  const listBody = await listRes.json().catch(() => ({}));
  console.log("GET pendientes:", listRes.status, "total=", listBody.total);
  console.log("  summary:", listBody.summary);

  if (listRes.status !== 200) failures.push("GET pendientes status");
  if (!listBody.summary || typeof listBody.summary.totalPending !== "number") {
    failures.push("summary missing");
  }
  if (!Array.isArray(listBody.rows)) failures.push("rows not array");

  const first = listBody.rows?.[0];
  if (first) {
    console.log("  sample row:", {
      customerName: first.customerName,
      tipificationName: first.tipificationName,
      isOverdue: first.isOverdue,
      displayStatus: first.displayStatus,
    });
    if (typeof first.isOverdue !== "boolean") failures.push("isOverdue missing");
  }

  // Crear pendiente de prueba si no hay ninguno
  let testId = first?.id;
  if (!testId) {
    console.log("\n--- Crear pendiente de prueba (tipificar seguimiento) ---");
    const carolinaLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        login: "Carolina.wom",
        password: process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!",
      }),
    });
    const carolinaCookie = parseCookie(carolinaLogin.headers.get("set-cookie"));
    if (!carolinaLogin.ok || !carolinaCookie) {
      failures.push("Carolina login for seed pendiente");
    } else {
      const [conv] = await sql`
        SELECT id, phone, customer_name FROM lead_conversations
        WHERE assigned_advisor_id = (SELECT id FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1)
          AND inbox_state = 'active'
        ORDER BY last_message_at DESC LIMIT 1
      `;
      if (!conv) {
        failures.push("no active conv for seed");
      } else {
        const followUpDate = new Date();
        followUpDate.setDate(followUpDate.getDate() + 5);
        const isoDate = followUpDate.toISOString().slice(0, 10);
        const saveRes = await fetch(`${base}/api/leads`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Cookie: carolinaCookie,
          },
          body: JSON.stringify({
            conversationId: conv.id,
            phone: conv.phone || "56900000099",
            customerName: conv.customer_name || "P4.1 verify",
            rut: "12.345.678-9",
            type: "seguimiento",
            notes: "P4.1 verify pendientes list",
            saveAction: "close",
            followUpDate: isoDate,
          }),
          signal: AbortSignal.timeout(90_000),
        });
        const saveBody = await saveRes.json().catch(() => ({}));
        console.log("  POST leads seguimiento:", saveRes.status, "followUpCreated:", saveBody.followUpCreated);
        if (!saveBody.followUpCreated) failures.push("followUpCreated false");

        const list2 = await fetch(`${base}/api/admin/pendientes?page=1&pageSize=5`, {
          headers: { Accept: "application/json", Cookie: cookie },
        });
        const body2 = await list2.json();
        testId = body2.rows?.[0]?.id;
        console.log("  pendientes after seed:", body2.total, testId);
        if (!testId) failures.push("no pendiente after seed");
      }
    }
  }

  if (testId) {
    console.log("\n--- P4.1 transfer test ---");
    const [targetAdvisor] = await sql`
      SELECT id, name FROM users
      WHERE role = 'asesora' AND active = true AND presence_status = 'disponible'
      ORDER BY name LIMIT 1
    `;
    if (!targetAdvisor) {
      failures.push("no disponible advisor for transfer");
    } else {
      const [before] = await sql`
        SELECT status, module, conversation_id FROM lead_follow_ups WHERE id = ${testId}
      `;
      const patchRes = await fetch(`${base}/api/admin/pendientes`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          action: "transfer",
          id: testId,
          advisorId: targetAdvisor.id,
        }),
      });
      const patchBody = await patchRes.json().catch(() => ({}));
      console.log("  PATCH transfer:", patchRes.status, patchBody);
      const [after] = await sql`
        SELECT status, module, owner_advisor_id FROM lead_follow_ups WHERE id = ${testId}
      `;
      const [conv] = await sql`
        SELECT inbox_state, assigned_advisor_id FROM lead_conversations WHERE id = ${before.conversation_id}
      `;
      console.log("  follow_up:", before, "→", after);
      console.log("  conversation:", conv);
      if (patchRes.status !== 200) failures.push("transfer HTTP");
      if (after?.status !== "transferred") failures.push("status not transferred");
      if (after?.module !== "recuperacion") failures.push("module not recuperacion");
      if (conv?.inbox_state !== "active") failures.push("chat not reopened");
      if (conv?.assigned_advisor_id !== targetAdvisor.id) failures.push("advisor not assigned");
    }
  }

  console.log("\n--- Regresión P3.0 ---");
  const { spawnSync } = await import("node:child_process");
  const p30 = spawnSync(
    process.execPath,
    ["--env-file=.env.local", "scripts/verify-p30-sale-on-script.mjs", `--base=${base}`],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  );
  console.log(p30.stdout?.split("\n").slice(-3).join("\n") || p30.stderr?.slice(0, 200));
  if (p30.status !== 0) failures.push("P3.0 regression");

  if (failures.length) {
    console.error("\nFALLOS P4.1:", failures.join("; "));
    process.exit(1);
  }
  console.log("\nOK — P4.1 pendientes + transfer verificado.");
} finally {
  await sql.end({ timeout: 5 });
}
