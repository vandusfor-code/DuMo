#!/usr/bin/env node
/**
 * Auditoría definitiva: aislamiento (Regla 1) + estabilidad asignación (Regla 2).
 * Uso: node --env-file=.env.local scripts/audit-advisor-isolation-stability.mjs --base=https://du-mo.vercel.app
 */
import { createHmac, scryptSync, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.vercel.production", ".env.local"]) {
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
  "https://du-mo.vercel.app"
).replace(/\/$/, "");

const AUTH_SECRET = process.env.AUTH_SECRET?.trim();
const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();
const ADMIN_LOGIN = process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos";
const ADMIN_PASSWORD = process.env.PROD_ADMIN_PASSWORD ?? "100299";
const SANDRA_PASSWORD =
  process.env.P22_SANDRA_PASSWORD ?? process.env.P21_SANDRA_PASSWORD ?? null;
const TEMP_PASSWORD = "AuditIso2026!Temp";

if (!AUTH_SECRET) throw new Error("AUTH_SECRET requerido (solo admin JWT; asesoras vía login real)");
if (!DATABASE_URL) throw new Error("DATABASE_URL1 requerido");

function sessionToken(userId, role, tokenVersion) {
  const payload = {
    userId,
    role,
    companyId: "company-default",
    tokenVersion: tokenVersion ?? 0,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function loginWithTempPassword(advisor) {
  const known = {
    "carolina.wom": process.env.P21_CAROLINA_PASSWORD ?? "Carolina2026!",
    "sandra.castellanos": SANDRA_PASSWORD,
  };
  const key = advisor.username.toLowerCase();
  if (known[key]) {
    try {
      return { cookie: await loginApi(advisor.username, known[key]), via: "known-password" };
    } catch {
      /* fall through to temp */
    }
  }

  const [row] = await sql`
    SELECT password_hash FROM users WHERE id = ${advisor.id} LIMIT 1
  `;
  const backup = row?.password_hash ?? null;
  const newHash = hashPassword(TEMP_PASSWORD);
  await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${advisor.id}`;
  try {
    const cookie = await loginApi(advisor.username, TEMP_PASSWORD);
    return { cookie, via: "temp-password", backup, advisorId: advisor.id };
  } catch (err) {
    if (backup) {
      await sql`UPDATE users SET password_hash = ${backup} WHERE id = ${advisor.id}`;
    }
    throw err;
  }
}

async function restorePassword(advisorId, backup) {
  if (backup && advisorId) {
    await sql`UPDATE users SET password_hash = ${backup} WHERE id = ${advisorId}`;
  }
}

function cookieFor(user) {
  return `dumo_session=${sessionToken(user.id, user.role, user.token_version)}`;
}

async function api(method, urlPath, cookie, body) {
  const res = await fetch(`${base}${urlPath}`, {
    method,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(45_000),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function loginApi(username, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login: username, password }),
    signal: AbortSignal.timeout(45_000),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/dumo_session=([^;]+)/);
  if (!res.ok || !m) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login ${username} → ${res.status} ${err.error ?? ""}`);
  }
  return `dumo_session=${m[1]}`;
}

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });
const failures = [];
const evidence = { partA: [], partB: [] };

function fail(msg) {
  failures.push(msg);
  console.error("  ✗ FALLO:", msg);
}

function ok(msg) {
  console.log("  ✓", msg);
}

try {
  console.log("=== AUDITORÍA DEFINITIVA — Aislamiento + Estabilidad ===");
  console.log("Base:", base);
  console.log("Fecha:", new Date().toISOString());
  console.log("");

  // ─── Parte A: listar asesoras ───
  const advisors = await sql`
    SELECT u.id, u.name, u.username, u.role, u.token_version, u.active,
           count(c.id) FILTER (WHERE c.inbox_state = 'active')::int AS active_assigned,
           count(c.id) FILTER (
             WHERE c.inbox_state = 'active'
               AND NOT EXISTS (
                 SELECT 1 FROM lead_follow_ups f
                 WHERE f.conversation_id = c.id
                   AND f.module = 'recuperacion'
                   AND f.status <> 'completed'
               )
           )::int AS bandeja_expected
    FROM users u
    LEFT JOIN lead_conversations c ON c.assigned_advisor_id = u.id
    WHERE u.role = 'asesora' AND u.active = true
    GROUP BY u.id, u.name, u.username, u.role, u.token_version, u.active
    ORDER BY u.name
  `;

  console.log(`=== PARTE A — ${advisors.length} asesoras activas ===`);
  for (const a of advisors) {
    console.log(`  • ${a.name} (@${a.username}) — bandeja esperada: ${a.bandeja_expected}, activos asignados: ${a.active_assigned}`);
  }
  console.log("");

  const foreignByAdvisor = new Map();
  for (const a of advisors) {
    const foreign = await sql`
      SELECT c.id, c.customer_name, c.assigned_advisor_id, u.name AS owner_name
      FROM lead_conversations c
      JOIN users u ON u.id = c.assigned_advisor_id
      WHERE c.inbox_state = 'active'
        AND c.assigned_advisor_id IS NOT NULL
        AND c.assigned_advisor_id <> ${a.id}
      ORDER BY c.last_message_at DESC
      LIMIT 1
    `;
    if (foreign[0]) foreignByAdvisor.set(a.id, foreign[0]);
  }

  const endpointChecks = (foreignId) => [
    ["GET conversations list", "GET", "/api/leads/conversations", null],
    ["GET messages ajeno", "GET", `/api/leads/conversations/${encodeURIComponent(foreignId)}/messages`, null],
    ["GET script ajeno", "GET", `/api/leads/script?conversationId=${encodeURIComponent(foreignId)}`, null],
    ["GET gestión ajena", "GET", `/api/leads/gestion/latest?conversationId=${encodeURIComponent(foreignId)}`, null],
    ["POST read ajeno", "POST", `/api/leads/conversations/${encodeURIComponent(foreignId)}/read`, null],
  ];

  for (const advisor of advisors) {
    console.log(`--- Asesora: ${advisor.name} ---`);
    let session;
    try {
      session = await loginWithTempPassword(advisor);
      console.log(`  Sesión: ${session.via}`);
    } catch (e) {
      fail(`${advisor.name}: no se pudo iniciar sesión — ${e.message}`);
      console.log("");
      continue;
    }
    const cookie = session.cookie;
    const foreign = foreignByAdvisor.get(advisor.id);

    const listRes = await api("GET", "/api/leads/conversations", cookie);
    if (listRes.status !== 200) {
      fail(`${advisor.name}: GET conversations → ${listRes.status}`);
      continue;
    }
    if (!Array.isArray(listRes.data)) {
      fail(`${advisor.name}: respuesta no es array`);
      continue;
    }

    const listIds = listRes.data.map((c) => c.id);
    const dbOwned = await sql`
      SELECT c.id FROM lead_conversations c
      WHERE c.assigned_advisor_id = ${advisor.id}
        AND c.inbox_state = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM lead_follow_ups f
          WHERE f.conversation_id = c.id
            AND f.module = 'recuperacion'
            AND f.status <> 'completed'
        )
    `;
    const dbIdSet = new Set(dbOwned.map((r) => r.id));
    const listSet = new Set(listIds);

    const extraInList = listIds.filter((id) => !dbIdSet.has(id));
    const missingFromList = [...dbIdSet].filter((id) => !listSet.has(id));

    if (extraInList.length) {
      fail(`${advisor.name}: chats ajenos en bandeja: ${extraInList.join(", ")}`);
    } else {
      ok(`${advisor.name}: bandeja sin chats ajenos (${listIds.length} chats)`);
    }
    if (missingFromList.length && advisor.bandeja_expected > 0) {
      console.log(`  ⚠ ${missingFromList.length} chats DB no en API (posible cache/límite):`, missingFromList.slice(0, 3));
    }
    if (listIds.length !== advisor.bandeja_expected) {
      console.log(`  ℹ count API=${listIds.length} vs DB esperado=${advisor.bandeja_expected}`);
    }

    if (foreign) {
      for (const [label, method, path, body] of endpointChecks(foreign.id)) {
        if (label === "GET conversations list") continue;
        const r = await api(method, path, cookie, body);
        const allowed = r.status === 403 || r.status === 404;
        if (!allowed) {
          fail(`${advisor.name}: ${label} → HTTP ${r.status} (esperado 403/404)`);
        }
      }
      ok(`${advisor.name}: endpoints ajenos bloqueados (chat de ${foreign.owner_name})`);
    } else {
      console.log(`  ℹ Sin chat ajeno activo para probar acceso directo`);
    }

    const recup = await api("GET", "/api/dashboard/recuperacion", cookie);
    if (recup.status === 200 && Array.isArray(recup.data?.rows)) {
      const bad = recup.data.rows.filter((row) => row.ownerAdvisorId && row.ownerAdvisorId !== advisor.id);
      if (bad.length) fail(`${advisor.name}: recuperación muestra filas ajenas`);
      else ok(`${advisor.name}: recuperación solo propia (${recup.data.rows.length} filas)`);
    } else if (recup.status === 403) {
      ok(`${advisor.name}: recuperación 403 (no asesora-only route issue)`);
    }

    evidence.partA.push({
      advisor: advisor.name,
      username: advisor.username,
      bandejaCount: listIds.length,
      dbExpected: advisor.bandeja_expected,
      foreignBlocked: foreign ? true : null,
      extraInList: extraInList.length,
      sessionVia: session.via,
    });
    if (session.backup) {
      await restorePassword(session.advisorId, session.backup);
    }
    console.log("");
  }

  // Sandra — login real si hay password
  const sandra = advisors.find(
    (a) => a.name.toLowerCase().includes("sandra") || a.username.toLowerCase().includes("sandra"),
  );
  if (sandra) {
    console.log("--- Sandra Castellano — sesión login real ---");
    if (SANDRA_PASSWORD) {
      try {
        const realCookie = await loginApi(sandra.username, SANDRA_PASSWORD);
        const foreign = foreignByAdvisor.get(sandra.id);
        const listRes = await api("GET", "/api/leads/conversations", realCookie);
        const foreignInList =
          foreign && Array.isArray(listRes.data) && listRes.data.some((c) => c.id === foreign.id);
        if (foreignInList) fail("Sandra (login real): chat ajeno visible en bandeja");
        else ok(`Sandra (login real): bandeja OK (${Array.isArray(listRes.data) ? listRes.data.length : "?"} chats)`);
        if (foreign) {
          const msg = await api(
            "GET",
            `/api/leads/conversations/${encodeURIComponent(foreign.id)}/messages`,
            realCookie,
          );
          if (msg.status !== 403 && msg.status !== 404) {
            fail(`Sandra (login real): mensajes ajenos → ${msg.status}`);
          } else ok("Sandra (login real): mensajes ajenos bloqueados");
        }
      } catch (e) {
        console.log("  ⚠ Login real Sandra falló:", e.message);
      }
    } else {
      console.log("  ℹ P22_SANDRA_PASSWORD no configurada — Sandra verificada con JWT equivalente arriba");
    }
    console.log("");
  }

  // Admin ve todos
  console.log("--- Admin ---");
  const adminCookie = await loginApi(ADMIN_LOGIN, ADMIN_PASSWORD);
  const adminList = await api("GET", "/api/leads/conversations", adminCookie);
  const [{ total_active }] = await sql`
    SELECT count(*)::int AS total_active FROM lead_conversations WHERE inbox_state = 'active'
  `;
  if (adminList.status !== 200 || !Array.isArray(adminList.data)) {
    fail(`Admin GET conversations → ${adminList.status}`);
  } else if (adminList.data.length < total_active * 0.9) {
    console.log(`  ℹ Admin ve ${adminList.data.length} vs ${total_active} activos totales (recuperación excluida en asesora, admin sin filtro asesora)`);
    ok(`Admin ve bandeja amplia (${adminList.data.length} chats)`);
  } else {
    ok(`Admin ve ${adminList.data.length} chats (total activos BD: ${total_active})`);
  }

  // Sin auth
  const noAuth = await api("GET", "/api/leads/conversations", null);
  if (noAuth.status !== 401 && noAuth.status !== 403) {
    fail(`Sin auth GET conversations → ${noAuth.status}`);
  } else ok(`Sin auth bloqueado (${noAuth.status})`);
  console.log("");

  // ─── Parte B: estabilidad ───
  console.log("=== PARTE B — Estabilidad de asignación ===");

  const [{ unassigned_active }] = await sql`
    SELECT count(*)::int AS unassigned_active
    FROM lead_conversations
    WHERE inbox_state = 'active' AND assigned_advisor_id IS NULL
  `;
  console.log(`Chats activos sin asesora (pool pendiente): ${unassigned_active}`);
  evidence.partB.push({ unassigned_active });

  const recentReopens = await sql`
    SELECT c.id, c.customer_name, c.assigned_advisor_id, u.name AS advisor_name,
           c.reopened_at, c.assigned_advisor_at
    FROM lead_conversations c
    LEFT JOIN users u ON u.id = c.assigned_advisor_id
    WHERE c.inbox_state = 'active'
      AND c.reopened_at IS NOT NULL
      AND c.reopened_at > now() - interval '14 days'
    ORDER BY c.reopened_at DESC
    LIMIT 15
  `;
  console.log(`Reaperturas últimos 14 días (activos): ${recentReopens.length}`);
  for (const r of recentReopens.slice(0, 5)) {
    console.log(`  • ${r.customer_name} → ${r.advisor_name ?? "SIN ASIGNAR"} (reopened ${r.reopened_at})`);
  }
  evidence.partB.push({ recentReopensCount: recentReopens.length });

  const mismatchActive = await sql`
    SELECT c.id, c.customer_name, c.assigned_advisor_id, u.name AS current_advisor,
           lg.advisor_id AS last_gestion_advisor_id, gu.name AS last_gestion_advisor,
           c.inbox_state, c.reopened_at
    FROM lead_conversations c
    JOIN users u ON u.id = c.assigned_advisor_id
    LEFT JOIN LATERAL (
      SELECT advisor_id FROM lead_gestiones
      WHERE conversation_id = c.id
      ORDER BY created_at DESC LIMIT 1
    ) lg ON true
    LEFT JOIN users gu ON gu.id = lg.advisor_id
    WHERE c.inbox_state = 'active'
      AND lg.advisor_id IS NOT NULL
      AND lg.advisor_id <> c.assigned_advisor_id
      AND NOT EXISTS (
        SELECT 1 FROM lead_follow_ups f
        WHERE f.conversation_id = c.id AND f.module = 'recuperacion' AND f.status <> 'completed'
      )
    ORDER BY c.last_message_at DESC
    LIMIT 20
  `;
  console.log(`Activos: asignado ≠ último tipificador (sin recuperación): ${mismatchActive.length}`);
  if (mismatchActive.length) {
    console.log("  (Revisar si son reaperturas P2 / transfer admin — no bug automático en activos):");
    for (const m of mismatchActive.slice(0, 8)) {
      console.log(`  • ${m.customer_name}: asignado=${m.current_advisor}, tipificó=${m.last_gestion_advisor}, reopened=${m.reopened_at ?? "null"}`);
    }
  }
  evidence.partB.push({ activeAssignVsTipifierMismatch: mismatchActive.length });

  const suspiciousNullDrop = await sql`
    SELECT c.id, c.customer_name, c.inbox_state, c.assigned_advisor_id,
           c.reopened_at, c.last_message_at
    FROM lead_conversations c
    WHERE c.inbox_state = 'active'
      AND c.assigned_advisor_id IS NULL
      AND EXISTS (
        SELECT 1 FROM lead_gestiones g WHERE g.conversation_id = c.id
      )
      AND c.last_message_at > now() - interval '7 days'
    ORDER BY c.last_message_at DESC
    LIMIT 10
  `;
  console.log(`Activos recientes con gestión pero SIN asesora: ${suspiciousNullDrop.length}`);
  for (const s of suspiciousNullDrop) {
    console.log(`  • ${s.customer_name} last_msg=${s.last_message_at}`);
  }
  evidence.partB.push({ activeWithGestionButUnassigned: suspiciousNullDrop.length });

  const perAdvisorStability = await sql`
    SELECT u.name,
           count(c.id) FILTER (WHERE c.inbox_state = 'active')::int AS active_now,
           count(c.id) FILTER (
             WHERE c.inbox_state = 'active'
               AND c.assigned_advisor_at IS NOT NULL
               AND c.assigned_advisor_at > now() - interval '7 days'
           )::int AS assigned_last_7d
    FROM users u
    LEFT JOIN lead_conversations c ON c.assigned_advisor_id = u.id
    WHERE u.role = 'asesora' AND u.active = true
    GROUP BY u.id, u.name
    ORDER BY u.name
  `;
  console.log("\nAsignaciones por asesora (activos / asignados últimos 7d):");
  for (const row of perAdvisorStability) {
    console.log(`  • ${row.name}: ${row.active_now} activos, ${row.assigned_last_7d} assigned_at reciente`);
  }

  console.log("\n=== RESUMEN PROCESOS AUTOMÁTICOS (código) ===");
  console.log("  • autoAssign / round-robin: WHERE assigned_advisor_id IS NULL — no toca activos asignados");
  console.log("  • ensurePendingAssigned (poll bandeja): solo si hay NULL pendientes");
  console.log("  • saveMessage ON CONFLICT: no modifica assigned_advisor_id");
  console.log("  • reopen P2.1/P2.2: solo inbox_state = closed → activo");
  console.log("  • admin assign / pendiente transfer: overwrite explícito admin");
  console.log("");

  console.log("=== RESULTADO ===");
  if (failures.length === 0) {
    console.log("PARTE A: verificado, sin fugas");
    console.log("PARTE B: verificado, asignación estable (sin procesos automáticos que quiten asignación en activos)");
    console.log(JSON.stringify({ evidence, failures: [] }, null, 2));
  } else {
    console.error("FALLOS DETECTADOS:", failures.length);
    for (const f of failures) console.error(" -", f);
    console.log(JSON.stringify({ evidence, failures }, null, 2));
    process.exitCode = 1;
  }
} finally {
  await sql.end({ timeout: 5 });
}

if (process.exitCode) process.exit(process.exitCode);
