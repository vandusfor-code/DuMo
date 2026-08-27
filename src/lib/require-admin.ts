import "server-only";
import { cookies, headers } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session-cookie";
import { verifySessionTokenEdge } from "@/lib/auth/session-edge";
import type { AuthRole } from "@/types/auth";

export type AdminSession = {
  userId: string;
  role: AuthRole;
};

/** Lee `dumo_session` del header Cookie crudo (respaldo si cookies() viene vacío en RSC). */
export function readSessionTokenFromCookieHeader(raw: string | null): string | null {
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name !== SESSION_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/**
 * Token de sesión: cookie (principal), header Cookie crudo o Authorization: Bearer.
 */
export async function getSessionToken(): Promise<string | null> {
  return getSessionTokenFromRequest(false);
}

/** Solo cookie — para APIs de asesora (ignora Bearer stale en localStorage). */
export async function getCookieSessionToken(): Promise<string | null> {
  return getSessionTokenFromRequest(true);
}

async function getSessionTokenFromRequest(cookieOnly: boolean): Promise<string | null> {
  const jar = await cookies();
  const cookieToken = jar.get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;

  const headerList = await headers();
  const fromCookieHeader = readSessionTokenFromCookieHeader(headerList.get("cookie"));
  if (fromCookieHeader) return fromCookieHeader;

  if (cookieOnly) return null;

  const bearer = headerList.get("authorization");
  const headerToken = bearer?.replace(/^Bearer\s+/i, "").trim();
  return headerToken || null;
}

/** Verifica el JWT de sesión (Node o Edge) sin consultar la base de datos. */
export async function getTokenPayload(): Promise<SessionPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return verifySessionToken(token) ?? (await verifySessionTokenEdge(token));
}

/** Autoriza rutas admin usando solo el rol del token — no depende de Postgres. */
export async function requireAdminSession(): Promise<AdminSession | null> {
  const payload = await getTokenPayload();
  if (!payload?.role) return null;
  if (payload.role !== "administrador" && payload.role !== "supervisor") return null;
  return { userId: payload.userId, role: payload.role as AuthRole };
}
