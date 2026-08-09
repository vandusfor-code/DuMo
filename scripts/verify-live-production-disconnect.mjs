#!/usr/bin/env node
/**
 * Prueba de revocación de sesión en PRODUCCIÓN (Vercel API + Railway Socket.io + Postgres).
 * Uso:
 *   npx tsx --env-file=.env.vercel.production --env-file=.env.local scripts/verify-live-production-disconnect.mjs
 */

import { createRequire } from "node:module";
import { createHmac } from "node:crypto";
import postgres from "postgres";
import { io as ioClient } from "socket.io-client";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
try {
  const p = require.resolve("server-only");
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
} catch {
  /* ignore */
}

const PROD_API = (process.env.PROD_API_URL ?? "https://du-mo.vercel.app").replace(/\/$/, "");
const SOCKET_URL = (process.env.DUMO_CRM_URL ?? "https://dumo-crm-production.up.railway.app").replace(
  /\/$/,
  "",
);
const AUTH_SECRET = process.env.AUTH_SECRET;
const ADMIN_LOGIN = process.env.PROD_ADMIN_LOGIN ?? "duvan.ramos";
const ADMIN_PASSWORD = process.env.PROD_ADMIN_PASSWORD ?? "100299";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL1?.trim()) return process.env.DATABASE_URL1.trim();
  const local = path.join(root, ".env.local");
  if (existsSync(local)) {
    for (const line of readFileSync(local, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^DATABASE_URL1=(.+)$/);
      if (m?.[1]) return m[1].trim();
    }
  }
  return process.env.RAILWAY_TEST_DATABASE_URL?.trim() ?? null;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createAdvisorToken(userId, role, tokenVersion) {
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

async function adminLogin() {
  const res = await fetch(`${PROD_API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ login: ADMIN_LOGIN, password: ADMIN_PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Login admin falló (${res.status}): ${data.error ?? "unknown"}`);
  assert(data.token, "Login admin no devolvió token");
  return data.token;
}

async function getSnapshot(adminToken) {
  const res = await fetch(`${PROD_API}/api/admin/live/snapshot`, {
    headers: { Authorization: `Bearer ${adminToken}`, Accept: "application/json" },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Snapshot falló (${res.status}): ${data.error ?? "unknown"}`);
  return data;
}

async function patchPresence(adminToken, advisorId, status) {
  const res = await fetch(`${PROD_API}/api/admin/live/presence`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ advisorId, status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PATCH ${status} falló (${res.status}): ${data.error ?? JSON.stringify(data)}`);
  return data;
}

async function validateTokenViaProfile(token) {
  const res = await fetch(`${PROD_API}/api/auth/profile`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  return { ok: res.ok, status: res.status };
}

const dbUrl = loadDatabaseUrl();
if (!dbUrl) {
  console.error("DATABASE_URL1 no disponible.");
  process.exit(1);
}
if (!AUTH_SECRET) {
  console.error("AUTH_SECRET no disponible (.env.vercel.production).");
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: dbUrl.includes("localhost") ? false : "require", prepare: false });

let backup = null;

try {
  console.log(`API producción: ${PROD_API}`);
  console.log(`Socket Railway: ${SOCKET_URL}\n`);

  const advisors = await sql`
    SELECT id, name, role, presence_status, token_version
    FROM users
    WHERE role = 'asesora' AND active = true
    ORDER BY name
  `;
  assert(advisors.length >= 2, "Se necesitan al menos 2 asesoras activas.");

  const target = advisors.find((a) => a.name === "Carolina") ?? advisors[0];
  const control = advisors.find((a) => a.id !== target.id);

  backup = {
    id: target.id,
    name: target.name,
    presence: target.presence_status,
    token_version: Number(target.token_version ?? 0),
  };
  const controlBackup = {
    id: control.id,
    token_version: Number(control.token_version ?? 0),
    presence: control.presence_status,
  };

  console.log(`Objetivo: ${target.name} (${target.id}) token_version=${backup.token_version}`);
  console.log(`Control:  ${control.name} (${control.id}) token_version=${controlBackup.token_version}\n`);

  console.log("1) Login admin + snapshot producción…");
  const adminToken = await adminLogin();
  const snapshot = await getSnapshot(adminToken);
  const snapRow = snapshot.advisors.find((a) => a.id === target.id);
  assert(snapRow, "Asesora objetivo no aparece en snapshot Live");
  console.log(`   Snapshot OK — ${snapshot.advisors.length} asesoras listadas\n`);

  const oldAdvisorToken = createAdvisorToken(target.id, target.role, backup.token_version);

  console.log("2) Socket producción + PATCH desconectado…");
  const socketMs = await new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setTimeout(() => reject(new Error("timeout session:revoked (>5s)")), 5000);
    let patched = false;

    const socket = ioClient(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token: oldAdvisorToken },
      reconnection: false,
      timeout: 15000,
    });

    socket.on("connect", async () => {
      if (patched) return;
      patched = true;
      try {
        const result = await patchPresence(adminToken, target.id, "desconectado");
        assert(result.sessionRevoked === true, "sessionRevoked debe ser true");
        assert(result.presenceStatus === "desconectado", "presenceStatus debe ser desconectado");
        console.log(`   PATCH OK — tokenVersion respuesta=${result.tokenVersion}`);
      } catch (err) {
        clearTimeout(timer);
        socket.disconnect();
        reject(err);
      }
    });

    socket.on("session:revoked", (payload) => {
      clearTimeout(timer);
      socket.disconnect();
      console.log(`   session:revoked recibido en ${Date.now() - started}ms`, payload);
      resolve(Date.now() - started);
    });

    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Socket connect_error: ${err.message}`));
    });
  });
  assert(socketMs < 5000, `Socket tardó demasiado (${socketMs}ms)`);

  console.log("\n3) Verificación DB + API…");
  const [targetDb] = await sql`
    SELECT presence_status, token_version FROM users WHERE id = ${target.id}
  `;
  assert(targetDb.presence_status === "desconectado", "DB: presence_status debe ser desconectado");
  assert(
    Number(targetDb.token_version) === backup.token_version + 1,
    `DB: token_version esperado ${backup.token_version + 1}, got ${targetDb.token_version}`,
  );

  const profileOld = await validateTokenViaProfile(oldAdvisorToken);
  assert(!profileOld.ok, "Token viejo debe fallar en /api/auth/profile");
  console.log(`   Token obsoleto rechazado (HTTP ${profileOld.status})`);

  const [controlDb] = await sql`
    SELECT presence_status, token_version FROM users WHERE id = ${control.id}
  `;
  assert(
    Number(controlDb.token_version) === controlBackup.token_version,
    "Control: token_version no debe cambiar",
  );
  assert(
    controlDb.presence_status === controlBackup.presence,
    "Control: presence_status no debe cambiar",
  );
  console.log(`   Control ${control.name} intacta (token_version=${controlDb.token_version})`);

  console.log("\n4) Restaurando disponible + token_version original…");
  await patchPresence(adminToken, target.id, "disponible");
  await sql`
    UPDATE users
    SET token_version = ${backup.token_version},
        presence_updated_by = NULL
    WHERE id = ${target.id}
  `;

  const [restored] = await sql`
    SELECT presence_status, token_version FROM users WHERE id = ${target.id}
  `;
  assert(restored.presence_status === "disponible", "Restauración: debe quedar disponible");
  assert(
    Number(restored.token_version) === backup.token_version,
    "Restauración: token_version debe volver al original",
  );
  console.log(`   ${target.name} restaurada → disponible, token_version=${restored.token_version}`);

  console.log("\nOK: prueba producción completada.");
  console.log(
    "\nNota: si la asesora tenía pestaña abierta durante la prueba, debería haber sido expulsada al login.",
  );
  console.log("Confirma con ella solo si quieres validar visualmente el redirect en el navegador.");
} catch (error) {
  console.error("\nFALLÓ:", error instanceof Error ? error.message : error);
  if (backup) {
    try {
      await sql`
        UPDATE users
        SET presence_status = ${backup.presence},
            token_version = ${backup.token_version},
            presence_updated_by = NULL
        WHERE id = ${backup.id}
      `;
      console.error(`Rollback aplicado para ${backup.name}.`);
    } catch {
      /* ignore */
    }
  }
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
