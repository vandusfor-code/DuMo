#!/usr/bin/env node
/**
 * P4.0 — Verifica creación de lead_follow_ups al tipificar con seguimiento
 * Uso: node --env-file=.env.local scripts/verify-p40-follow-up-create.mjs --base=https://du-mo.vercel.app
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

for (const name of [".env.local", ".env.production.local"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k]) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[k] = val;
  }
}

const base = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  "https://du-mo.vercel.app"
).replace(/\/$/, "");

const skipRegression = process.argv.includes("--skip-regression");

const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();

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
  const data = await res.json().catch(() => ({}));
  const cookie = parseCookie(res.headers.get("set-cookie"));
  if (!res.ok || !cookie) throw new Error(`Login ${login} falló (${res.status})`);
  return { cookie, user: data.user };
}

function tomorrowDateInput() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
  const failures = [];
  const followUpDate = tomorrowDateInput();

  try {
    console.log("=== P4.0 verify — lead_follow_ups al tipificar seguimiento ===");
    console.log("Base:", base);
    console.log("Fecha prueba:", followUpDate);

    console.log("\n--- 0) Warmup migraciones (GET /api/system/db) ---");
    const dbProbe = await fetch(`${base}/api/system/db`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const dbBody = await dbProbe.json().catch(() => ({}));
    console.log("  HTTP:", dbProbe.status, "connected:", dbBody.connected);
    const hasTable = Array.isArray(dbBody.tables) && dbBody.tables.includes("lead_follow_ups");
    if (!hasTable) {
      console.log("  tables:", dbBody.tables);
    }

    const [tableRow] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'lead_follow_ups'
      ) AS ok
    `;
    if (!tableRow?.ok) {
      throw new Error("Tabla lead_follow_ups no existe — deploy/migración pendiente");
    }
    console.log("  Tabla lead_follow_ups: OK");

    const [carolina] = await sql`SELECT id, username FROM users WHERE username ILIKE 'Carolina.wom' LIMIT 1`;
    if (!carolina) throw new Error("Usuario Carolina.wom no encontrado");

    const activeConvs = await sql`
      SELECT id, customer_name, phone
      FROM lead_conversations
      WHERE assigned_advisor_id = ${carolina.id} AND inbox_state = 'active'
      ORDER BY last_message_at DESC
      LIMIT 2
    `;
    if (activeConvs.length < 2) {
      throw new Error(`Se necesitan 2 chats activos para Carolina; hay ${activeConvs.length}`);
    }

    const [convConsulta, convSeguimiento] = activeConvs;
    const session = await login("Carolina.wom", process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!");

    const [countBefore] = await sql`SELECT count(*)::int AS n FROM lead_follow_ups`;

    console.log("\n--- 1) Tipificar consulta (sin seguimiento) ---");
    const conRes = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        conversationId: convConsulta.id,
        phone: convConsulta.phone || "56900000002",
        customerName: convConsulta.customer_name || "P4.0 consulta",
        rut: "12.345.678-9",
        type: "consulta",
        notes: "P4.0 verify no follow-up",
        saveAction: "close",
        lines: [],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const conBody = await conRes.json().catch(() => ({}));
    const conGestionId = conBody.lead?.id;
    console.log("  HTTP:", conRes.status, "gestionId:", conGestionId ?? "NONE");

    if (conRes.status !== 201) failures.push(`consulta HTTP ${conRes.status}`);

    const [conFollow] = conGestionId
      ? await sql`SELECT id FROM lead_follow_ups WHERE gestion_id = ${conGestionId}`
      : [null];
    if (conFollow) failures.push("consulta creó lead_follow_ups (no debería)");
    else console.log("  OK — consulta sin fila lead_follow_ups");

    console.log("\n--- 2) Tipificar seguimiento + Guardar y cerrar ---");
    const segRes = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: session.cookie,
      },
      body: JSON.stringify({
        conversationId: convSeguimiento.id,
        phone: convSeguimiento.phone || "56900000001",
        customerName: convSeguimiento.customer_name || "P4.0 seguimiento",
        rut: "12.345.678-9",
        type: "seguimiento",
        notes: "P4.0 verify follow-up create",
        saveAction: "close",
        followUpDate,
        lines: [],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const segBody = await segRes.json().catch(() => ({}));
    console.log("  HTTP:", segRes.status, "gestionId:", segBody.lead?.id ?? "NONE");
    console.log("  followUpDate resp:", segBody.followUpDate ?? "(none)");
    console.log("  followUpCreated resp:", segBody.followUpCreated ?? "(none)");
    console.log("  inboxState resp:", segBody.inboxState ?? "(none)");

    if (segRes.status !== 201) failures.push(`seguimiento HTTP ${segRes.status}`);
    const gestionId = segBody.lead?.id;
    if (!gestionId) failures.push("sin gestionId en respuesta");

    const [gestionRow] = gestionId
      ? await sql`
          SELECT follow_up_date::text AS follow_up_date
          FROM lead_gestiones WHERE id = ${gestionId}
        `
      : [null];
    const [followRow] = gestionId
      ? await sql`
          SELECT id, gestion_id, conversation_id, advisor_id, tipification_slug,
                 follow_up_date::text AS follow_up_date, status
          FROM lead_follow_ups WHERE gestion_id = ${gestionId}
        `
      : [null];
    const [convState] = await sql`
      SELECT inbox_state FROM lead_conversations WHERE id = ${convSeguimiento.id}
    `;

    console.log("  BD gestion follow_up_date:", gestionRow?.follow_up_date);
    console.log("  BD lead_follow_ups:", followRow);
    console.log("  BD inbox_state:", convState?.inbox_state);

    if (gestionRow?.follow_up_date !== followUpDate) failures.push("follow_up_date gestión incorrecta");
    if (!followRow) failures.push("sin fila lead_follow_ups");
    if (followRow && followRow.status !== "pending") failures.push("status != pending");
    if (followRow && followRow.tipification_slug !== "seguimiento") failures.push("slug incorrecto");
    if (convState?.inbox_state !== "closed") failures.push("inbox no cerró");

    const [countAfter] = await sql`SELECT count(*)::int AS n FROM lead_follow_ups`;
    console.log("\n--- 3) Conteo lead_follow_ups ---");
    console.log(`  ${countBefore.n} → ${countAfter.n} (+${countAfter.n - countBefore.n})`);
    if (countAfter.n <= countBefore.n) failures.push("contador lead_follow_ups no subió");

    if (failures.length) {
      console.error("\nFALLOS P4.0:", failures.join("; "));
      process.exit(1);
    }

    console.log("\nOK — P4.0 verificado.");

    if (!skipRegression) {
      console.log("\n=== Regresión P3.0 ===");
      const p30 = spawnSync(
        process.execPath,
        ["--env-file=.env.local", "scripts/verify-p30-sale-on-script.mjs", `--base=${base}`],
        { cwd: root, stdio: "inherit", env: process.env },
      );
      if (p30.status !== 0) process.exit(p30.status ?? 1);

      console.log("\n=== Regresión P3.1 ===");
      const p31 = spawnSync(
        process.execPath,
        ["--env-file=.env.local", "scripts/verify-p31-e2e-ventas-loop.mjs", `--base=${base}`],
        { cwd: root, stdio: "inherit", env: process.env },
      );
      if (p31.status !== 0) process.exit(p31.status ?? 1);
    }

    console.log("\nOK — P4.0 + regresión P3 completa.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
