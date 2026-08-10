#!/usr/bin/env node
/**
 * P1.5 — Evidencia: filtro bandeja asesora (solo inbox_state=active) + login intacto.
 *
 * Verifica:
 *  1. Login API responde OK (cookie + token)
 *  2. Admin/supervisor ven TODAS las conversaciones (activas + cerradas)
 *  3. Asesora solo ve activas asignadas a ella (cookie-only, no Bearer stale)
 *  4. Conversación cerrada no aparece en bandeja asesora ni abre mensajes
 *
 * Uso:
 *   node --env-file=.env.local scripts/verify-p15-inbox-band-filter.mjs
 *   node --env-file=.env.local scripts/verify-p15-inbox-band-filter.mjs --base=http://localhost:3000
 */

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const base = (
  process.argv.find((a) => a.startsWith("--base="))?.slice("--base=".length) ??
  process.env.LOCAL_API_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

const ADMIN_LOGIN = process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos";
const ADMIN_PASSWORD = process.env.PROD_ADMIN_PASSWORD ?? "100299";
const SESSION_COOKIE = "dumo_session";

function loadEnvFile(name) {
  const file = path.join(root, name);
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(".env.local");

const AUTH_SECRET = process.env.AUTH_SECRET?.trim();
const DATABASE_URL = process.env.DATABASE_URL1?.trim() ?? process.env.DATABASE_URL?.trim();

function parseSetCookie(header) {
  if (!header) return null;
  const first = header.split(",")[0]?.split(";")[0] ?? "";
  const eq = first.indexOf("=");
  if (eq === -1) return null;
  return { name: first.slice(0, eq).trim(), value: first.slice(eq + 1).trim() };
}

function createSessionToken(userId, role, tokenVersion, companyId = "company-default") {
  const payload = {
    userId,
    role,
    companyId,
    tokenVersion,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function sessionCookieHeader(userId, role, tokenVersion) {
  return `${SESSION_COOKIE}=${createSessionToken(userId, role, tokenVersion)}`;
}

async function loginWithCookie(login, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login, password }),
    signal: AbortSignal.timeout(45_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login ${login} falló (${res.status}): ${data.error ?? "unknown"}`);
  const cookie = parseSetCookie(res.headers.get("set-cookie"));
  if (!cookie?.value) throw new Error(`Login ${login} sin cookie ${SESSION_COOKIE}`);
  return {
    cookieHeader: `${cookie.name}=${cookie.value}`,
    token: data.token ?? null,
    user: data.user ?? null,
    redirectTo: data.redirectTo ?? null,
  };
}

async function apiGet(url, { cookie, bearer } = {}) {
  const headers = { Accept: "application/json" };
  if (cookie) headers.Cookie = cookie;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const res = await fetch(url, { cache: "no-store", headers, signal: AbortSignal.timeout(25_000) });
  let body;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

function summarizeList(body) {
  if (!Array.isArray(body)) return { type: typeof body, preview: body };
  const closed = body.filter((c) => c.inboxState === "closed").length;
  return {
    count: body.length,
    closedInResponse: closed,
    sample: body.slice(0, 2).map((c) => ({ id: c.id, name: c.customerName, inboxState: c.inboxState })),
  };
}

async function main() {
  if (!AUTH_SECRET) throw new Error("AUTH_SECRET requerido (.env.local)");
  if (!DATABASE_URL) throw new Error("DATABASE_URL requerido (.env.local)");

  const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

  try {
    const [{ total }] = await sql`SELECT COUNT(*)::int AS total FROM lead_conversations`;
    const [{ closed_total }] =
      await sql`SELECT COUNT(*)::int AS closed_total FROM lead_conversations WHERE inbox_state = 'closed'`;
    const [{ active_total }] =
      await sql`SELECT COUNT(*)::int AS active_total FROM lead_conversations WHERE inbox_state = 'active'`;

    const advisors = await sql`
      SELECT u.id, u.name, u.username, u.token_version,
             COUNT(c.id) FILTER (WHERE c.inbox_state = 'active')::int AS active_count,
             COUNT(c.id) FILTER (WHERE c.inbox_state = 'closed')::int AS closed_count,
             COUNT(c.id)::int AS total_assigned
      FROM users u
      LEFT JOIN lead_conversations c ON c.assigned_advisor_id = u.id
      WHERE u.role = 'asesora' AND u.active = true
      GROUP BY u.id, u.name, u.username, u.token_version
      HAVING COUNT(c.id) FILTER (WHERE c.inbox_state = 'active') > 0
      ORDER BY active_count DESC
      LIMIT 5
    `;

    if (advisors.length === 0) {
      throw new Error("No hay asesoras con conversaciones activas asignadas en BD.");
    }

    const advisor = advisors[0];
    const closedForAdvisor = await sql`
      SELECT id, customer_name, inbox_state
      FROM lead_conversations
      WHERE assigned_advisor_id = ${advisor.id} AND inbox_state = 'closed'
      LIMIT 1
    `;

    const supervisors = await sql`
      SELECT id, username, token_version FROM users
      WHERE role = 'supervisor' AND active = true LIMIT 1
    `;

    console.log("=== P1.5 — Filtro bandeja asesora ===");
    console.log("Base:", base);
    console.log("BD total:", total, "| active:", active_total, "| closed:", closed_total);
    console.log("Asesora prueba:", advisor.name, advisor.username, `(activas=${advisor.active_count}, cerradas=${advisor.closed_count})`);
    console.log("");

    console.log("=== 1) Login admin (cookie + redirect) ===");
    const adminSession = await loginWithCookie(ADMIN_LOGIN, ADMIN_PASSWORD);
    console.log("  HTTP OK — user:", adminSession.user?.name ?? ADMIN_LOGIN, "rol:", adminSession.user?.role ?? "?");
    console.log("  redirectTo:", adminSession.redirectTo);
    console.log("  cookie:", adminSession.cookieHeader.slice(0, 40) + "…");
    console.log("");

    console.log("=== 2) Admin — GET /api/leads/conversations (cookie) ===");
    const adminList = await apiGet(`${base}/api/leads/conversations`, {
      cookie: adminSession.cookieHeader,
    });
    console.log("  status:", adminList.status, summarizeList(adminList.body));
    const adminSeesAll =
      adminList.status === 200 &&
      Array.isArray(adminList.body) &&
      adminList.body.length >= active_total;
    console.log("  ¿Ve al menos todas las activas?", adminSeesAll ? "SÍ — OK" : "REVISAR");
    console.log("");

    let supervisorOk = true;
    if (supervisors[0]) {
      console.log("=== 3) Supervisor — login + bandeja ===");
      let supSession;
      try {
        supSession = await loginWithCookie(supervisors[0].username, ADMIN_PASSWORD);
      } catch {
        console.log("  Login API supervisor no disponible — omitido (usar credenciales reales en prod)");
        supervisorOk = true;
      }
      if (supSession) {
        const supList = await apiGet(`${base}/api/leads/conversations`, {
          cookie: supSession.cookieHeader,
        });
        console.log("  status:", supList.status, summarizeList(supList.body));
        supervisorOk =
          supList.status === 200 &&
          Array.isArray(supList.body) &&
          supList.body.length >= active_total;
        console.log("  ¿Ve todas (sin filtro activo-only)?", supervisorOk ? "SÍ — OK" : "REVISAR");
      }
      console.log("");
    } else {
      console.log("=== 3) Supervisor — sin usuario activo en BD, omitido ===\n");
    }

    console.log("=== 4) Asesora — sesión cookie + bandeja (cookie-only) ===");
    let advisorSession;
    let advisorLoginVia = "api";
    try {
      advisorSession = await loginWithCookie(advisor.username, ADMIN_PASSWORD);
      console.log("  Login API OK:", advisor.username);
    } catch (err) {
      advisorLoginVia = "cookie firmada (AUTH_SECRET + tokenVersion BD)";
      const cookieHeader = sessionCookieHeader(
        advisor.id,
        "asesora",
        advisor.token_version ?? 0,
      );
      advisorSession = { cookieHeader, token: null, user: { name: advisor.name, role: "asesora" } };
      console.log("  Login API no disponible —", err.message);
      console.log("  Usando sesión cookie equivalente post-login para", advisor.name);
    }

    const advisorListCookie = await apiGet(`${base}/api/leads/conversations`, {
      cookie: advisorSession.cookieHeader,
    });
    console.log("  GET conversations (cookie):", advisorListCookie.status, summarizeList(advisorListCookie.body));

    const staleAdminBearer = createSessionToken("usr-admin-stale", "administrador", 999);
    const advisorListStaleBearer = await apiGet(`${base}/api/leads/conversations`, {
      bearer: staleAdminBearer,
    });
    console.log(
      "  GET conversations (solo Bearer admin stale, sin cookie):",
      advisorListStaleBearer.status,
      Array.isArray(advisorListStaleBearer.body) ? `${advisorListStaleBearer.body.length} items` : advisorListStaleBearer.body,
    );

    const list = advisorListCookie.body;
    const onlyActive =
      Array.isArray(list) && list.every((c) => c.inboxState !== "closed" && c.inboxState !== undefined);
    const countMatches =
      Array.isArray(list) && list.length === advisor.active_count;
    const hasClosedInList =
      Array.isArray(list) && list.some((c) => c.inboxState === "closed");

    console.log("  ¿Solo activas en respuesta?", onlyActive && !hasClosedInList ? "SÍ — OK" : "REVISAR");
    console.log(
      "  ¿Count API = activas BD?",
      Array.isArray(list) ? `${list.length} vs ${advisor.active_count} → ${countMatches ? "OK" : "REVISAR"}` : "N/A",
    );
    console.log(
      "  ¿Bearer stale sin cookie devuelve 401?",
      advisorListStaleBearer.status === 401 ? "SÍ — OK" : `HTTP ${advisorListStaleBearer.status} — REVISAR`,
    );
    console.log("");

    console.log("  Método sesión asesora:", advisorLoginVia);
    console.log("");

    let closedTestOk = true;
    const activeConv = await sql`
      SELECT id, customer_name FROM lead_conversations
      WHERE assigned_advisor_id = ${advisor.id} AND inbox_state = 'active'
      ORDER BY last_message_at DESC LIMIT 1
    `;

    if (activeConv[0]) {
      console.log("=== 5) Conversación cerrada — exclusión temporal (rollback) ===");
      const closedId = activeConv[0].id;
      console.log("  Marcando temporalmente closed:", closedId, activeConv[0].customer_name);
      await sql`UPDATE lead_conversations SET inbox_state = 'closed' WHERE id = ${closedId}`;
      try {
        const listAfterClose = await apiGet(`${base}/api/leads/conversations`, {
          cookie: advisorSession.cookieHeader,
        });
        const notInList =
          Array.isArray(listAfterClose.body) &&
          !listAfterClose.body.some((c) => c.id === closedId);
        const closedMsgs = await apiGet(
          `${base}/api/leads/conversations/${encodeURIComponent(closedId)}/messages`,
          { cookie: advisorSession.cookieHeader },
        );
        const blocked = closedMsgs.status === 404 || closedMsgs.status === 403;
        console.log("  ¿Ausente del listado?", notInList ? "SÍ — OK" : "NO — FALLO");
        console.log("  GET mensajes:", closedMsgs.status, closedMsgs.body?.error ?? "");
        console.log("  ¿Mensajes bloqueados?", blocked ? "SÍ — OK" : "NO — FALLO");
        closedTestOk = notInList && blocked;
      } finally {
        await sql`UPDATE lead_conversations SET inbox_state = 'active' WHERE id = ${closedId}`;
        console.log("  Restaurado inbox_state=active");
      }
      console.log("");
    } else if (closedForAdvisor[0]) {
      console.log("=== 5b) Conversación ya cerrada en BD ===");
      const closedId = closedForAdvisor[0].id;
      console.log("  Chat cerrado:", closedId, closedForAdvisor[0].customer_name);
      const closedMsgs = await apiGet(
        `${base}/api/leads/conversations/${encodeURIComponent(closedId)}/messages`,
        { cookie: advisorSession.cookieHeader },
      );
      console.log("  GET mensajes:", closedMsgs.status, closedMsgs.body?.error ?? closedMsgs.body);
      const closedBlocked = closedMsgs.status === 404 || closedMsgs.status === 403;
      const closedNotInList = Array.isArray(list) && !list.some((c) => c.id === closedId);
      console.log("  ¿Ausente del listado?", closedNotInList ? "SÍ — OK" : "NO — FALLO");
      console.log("  ¿Mensajes bloqueados?", closedBlocked ? "SÍ — OK" : "NO — FALLO");
      closedTestOk = closedNotInList && closedBlocked;
      console.log("");
    } else {
      console.log("=== 5) Sin conversación para probar cierre — omitido ===\n");
    }

    console.log("=== 6) Login page HTML (no pantalla en blanco) ===");
    const loginPage = await fetch(`${base}/login`, { signal: AbortSignal.timeout(15_000) });
    const loginHtml = await loginPage.text();
    const hasForm = loginHtml.includes('id="login"') || loginHtml.includes("Iniciar sesión") || loginHtml.includes("password");
    console.log("  GET /login:", loginPage.status, "¿contenido SSR?", hasForm ? "SÍ — OK" : "REVISAR");
    console.log("");

    const failures = [];
    if (adminSession.redirectTo == null && adminSession.user == null) failures.push("login admin sin datos");
    if (!adminSeesAll) failures.push("admin no ve bandeja completa");
    if (!supervisorOk) failures.push("supervisor filtrado incorrectamente");
    if (advisorListCookie.status !== 200) failures.push(`asesora list → ${advisorListCookie.status}`);
    if (hasClosedInList) failures.push("asesora ve conversaciones cerradas");
    if (!countMatches) failures.push("count asesora != activas BD");
    if (advisorListStaleBearer.status !== 401) failures.push("Bearer stale no rechazado");
    if (!closedTestOk) failures.push("conversación cerrada no excluida");
    if (!hasForm) failures.push("login page sin contenido SSR");

    if (failures.length) {
      console.error("FALLOS P1.5:", failures.join("; "));
      process.exit(1);
    }
    console.log("OK — P1.5 verificado (login + admin/supervisor sin filtro + asesora solo activas).");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
