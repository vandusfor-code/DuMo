#!/usr/bin/env node
/**
 * Verifica etapa 4: token_version + revocación de sesión + socket session:revoked.
 * Uso:
 *   npx tsx --env-file=.env.railway.postgres.local scripts/verify-live-session-revoke.mjs
 */

import { createRequire } from "node:module";
import { createServer } from "node:http";
import postgres from "postgres";
import { io as ioClient } from "socket.io-client";
import { loadRailwayTestDatabaseUrl } from "./railway-postgres-env.mjs";

const require = createRequire(import.meta.url);
try {
  const p = require.resolve("server-only");
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} };
} catch {
  /* ignore */
}

process.env.DATABASE_URL1 =
  process.env.DATABASE_URL1?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  loadRailwayTestDatabaseUrl();
process.env.ALLOW_RUNTIME_MIGRATIONS = "1";

const url = process.env.DATABASE_URL1;
if (!url) {
  console.error("No hay DATABASE_URL1.");
  process.exit(1);
}

const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", prepare: false });

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function loadAuthModules() {
  const sessionCookie = await import("../src/lib/auth/session-cookie.ts");
  const sessionVersion = await import("../src/lib/auth/session-version.ts");
  const resolveSession = await import("../src/lib/auth/resolve-session-user.ts");
  const authRepo = await import("../src/repositories/auth.repository.ts");
  return { ...sessionCookie, ...sessionVersion, ...resolveSession, ...authRepo };
}

async function validateTokenForUser(token, findById, mods) {
  const payload = mods.verifySessionToken(token);
  if (!payload) return { ok: false, reason: "invalid-token" };

  try {
    const user = await findById(payload.userId);
    if (!user?.active) return { ok: false, reason: "inactive" };
    mods.assertSessionNotRevoked(payload, user);
    return { ok: true, user, allowsFallback: mods.allowsJwtFallback(payload) };
  } catch (err) {
    if (err?.name === "SessionRevokedError") {
      return { ok: false, reason: "revoked" };
    }
    if (!mods.allowsJwtFallback(payload)) {
      return { ok: false, reason: "db-fail-no-fallback" };
    }
    return { ok: true, reason: "jwt-fallback", allowsFallback: true };
  }
}

async function disconnectAdvisor(advisorId) {
  const { adminLiveService } = await import("../src/services/admin-live.service.ts");
  return adminLiveService.setAdvisorPresence(advisorId, "desconectado", "verify-session-revoke");
}

async function restoreAdvisor(advisorId) {
  const { adminLiveService } = await import("../src/services/admin-live.service.ts");
  return adminLiveService.setAdvisorPresence(advisorId, "disponible", "verify-session-revoke-restore");
}

let backup = [];

try {
  const mods = await loadAuthModules();
  const findById = (id) => mods.getAuthRepository().findById(id);

  const advisors = await sql`
    SELECT id, name, role, company_id, token_version, presence_status
    FROM users WHERE role = 'asesora' AND active = true ORDER BY name LIMIT 2
  `;
  assert(advisors.length >= 2, "Se necesitan 2 asesoras activas.");
  const [target, control] = advisors;

  for (const row of advisors) {
    backup.push({
      id: row.id,
      presence: row.presence_status,
      token_version: row.token_version,
    });
  }

  // Normalizar estado inicial del objetivo de prueba
  await restoreAdvisor(target.id);
  const [targetFresh] = await sql`
    SELECT token_version FROM users WHERE id = ${target.id}
  `;
  target.token_version = targetFresh.token_version;

  console.log("Verificación 2: usuario NO desconectado mantiene sesión intacta…");
  const controlBeforeVersion = control.token_version;
  const legacyToken = mods.createSessionToken(
    control.id,
    control.role,
    control.company_id ?? "company-default",
  );
  const explicitZeroToken = mods.createSessionToken(
    control.id,
    control.role,
    control.company_id ?? "company-default",
    0,
  );

  const legacyCheck = await validateTokenForUser(legacyToken, findById, mods);
  assert(legacyCheck.ok, "token legacy sin tokenVersion debe seguir válido");
  assert(legacyCheck.allowsFallback === true, "legacy permite fallback JWT");

  const explicitCheck = await validateTokenForUser(explicitZeroToken, findById, mods);
  assert(explicitCheck.ok, "token con tokenVersion=0 debe seguir válido");
  assert(explicitCheck.allowsFallback === false, "tokenVersion explícito desactiva fallback");

  const [controlAfter] = await sql`SELECT token_version FROM users WHERE id = ${control.id}`;
  assert(controlAfter.token_version === controlBeforeVersion, "token_version del control no debe cambiar");
  console.log(`   OK → ${control.name} intacta (token_version=${controlAfter.token_version})`);

  console.log("\nVerificación 1: Desconectado + session:revoked en <3s…");
  const oldToken = mods.createSessionToken(
    target.id,
    target.role,
    target.company_id ?? "company-default",
    Number(target.token_version ?? 0),
  );

  const { attachSocketServer } = await import("../realtime/socket-server.mjs");
  const httpServer = createServer();
  attachSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const port = httpServer.address().port;

  const socketMs = await new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setTimeout(() => reject(new Error("timeout socket session:revoked")), 3000);
    const socket = ioClient(`http://127.0.0.1:${port}`, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token: oldToken },
    });
    socket.on("connect", async () => {
      try {
        await disconnectAdvisor(target.id);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
    socket.on("session:revoked", () => {
      clearTimeout(timer);
      socket.disconnect();
      resolve(Date.now() - started);
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  httpServer.close();
  assert(socketMs < 3000, `evento socket tardó demasiado (${socketMs}ms)`);
  console.log(`   OK → session:revoked recibido en ${socketMs}ms (vía PATCH desconectado real)`);

  console.log("\nVerificación 1b: token obsoleto rechazado en API…");
  const revokedCheck = await validateTokenForUser(oldToken, findById, mods);
  assert(revokedCheck.ok === false && revokedCheck.reason === "revoked", "token previo debe quedar revocado");

  const [targetRow] = await sql`
    SELECT token_version, presence_status FROM users WHERE id = ${target.id}
  `;
  assert(
    targetRow.token_version === Number(target.token_version ?? 0) + 1,
    "token_version debe incrementar en desconectado",
  );
  console.log(`   OK → acceso revocado (token_version=${targetRow.token_version})`);

  console.log("\nVerificación 3: re-login con JWT coherente…");
  const reloginToken = mods.createSessionToken(
    target.id,
    target.role,
    target.company_id ?? "company-default",
    targetRow.token_version,
  );
  const reloginCheck = await validateTokenForUser(reloginToken, findById, mods);
  assert(reloginCheck.ok, "nuevo JWT con token_version actual debe ser válido");
  console.log(`   OK → JWT tokenVersion=${targetRow.token_version} aceptado`);

  console.log("\nVerificación 4: fallback JWT bloqueado con tokenVersion…");
  const findByIdFail = async () => {
    throw new Error("simulated DB outage");
  };
  const failWithVersion = await validateTokenForUser(reloginToken, findByIdFail, mods);
  assert(
    failWithVersion.ok === false && failWithVersion.reason === "db-fail-no-fallback",
    "con tokenVersion no debe haber fallback JWT",
  );

  const failLegacy = await validateTokenForUser(legacyToken, findByIdFail, mods);
  assert(failLegacy.ok === true && failLegacy.reason === "jwt-fallback", "legacy sí puede fallback");

  assert(
    mods.isSessionRevoked({ userId: target.id, exp: 9999999999, tokenVersion: 0 }, 1),
    "revocado cuando db>jwt",
  );
  assert(!mods.isSessionRevoked({ userId: control.id, exp: 9999999999 }, 0), "no revocado cuando db=jwt");
  assert(mods.tokenVersionFromPayload({ userId: "x", exp: 1 }) === 0, "legacy cuenta como 0");
  assert(mods.allowsJwtFallback({ userId: "x", exp: 1, tokenVersion: 0 }) === false, "explícito 0 sin fallback");
  console.log("   OK → fallback desactivado con tokenVersion; legacy conserva fallback");

  console.log("\nRestaurando estado…");
  await restoreAdvisor(target.id);

  console.log("\nOK: etapa 4 (token_version + revocación) verificada.");
} catch (error) {
  console.error("\nFALLÓ:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  try {
    for (const row of backup) {
      await sql`
        UPDATE users
        SET presence_status = ${row.presence},
            token_version = ${row.token_version},
            presence_updated_by = NULL
        WHERE id = ${row.id}
      `;
    }
  } catch {
    /* best effort */
  }
  await sql.end({ timeout: 5 });
}
