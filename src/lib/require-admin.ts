import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session-cookie";
import { verifySessionTokenEdge } from "@/lib/auth/session-edge";
import type { AuthRole } from "@/types/auth";

export type AdminSession = {
  userId: string;
  role: AuthRole;
};

/** Verifica el JWT de sesión (Node o Edge) sin consultar la base de datos. */
export async function getTokenPayload(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
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
