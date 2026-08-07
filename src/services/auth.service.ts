import "server-only";
import { cookies } from "next/headers";
import {
  authUserToPublicUser,
  getAuthRepository,
  redirectForRole,
} from "@/repositories/auth.repository";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/auth/session-cookie";
import { verifySessionTokenEdge } from "@/lib/auth/session-edge";
import type { AuthRole, AuthUser, LoginResult } from "@/types/auth";
import { DEFAULT_COMPANY_ID } from "@/types/tenant";
import { withQueryTimeout } from "@/server/db/client";

async function resolveSessionPayload(token: string): Promise<SessionPayload | null> {
  return verifySessionToken(token) ?? (await verifySessionTokenEdge(token));
}

function userFromPayload(payload: SessionPayload): AuthUser | null {
  if (!payload.role) return null;
  return {
    id: payload.userId,
    username: "",
    email: "",
    name: "",
    role: payload.role as AuthRole,
    active: true,
    avatarUrl: "",
    companyId: payload.companyId ?? DEFAULT_COMPANY_ID,
  };
}

export const authService = {
  async login(login: string, password: string): Promise<LoginResult | null> {
    const repo = getAuthRepository();
    await repo.ensureSeedAdmin();
    const user = await repo.authenticate(login, password);
    if (!user) return null;
    return { user, redirectTo: redirectForRole(user.role) };
  },

  async setSessionCookie(userId: string, role?: string, companyId?: string): Promise<void> {
    // El rol debe viajar siempre en el token: un token sin rol deja la sesión
    // sin separación admin/asesora.
    const token = createSessionToken(userId, role, companyId);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  },

  async clearSessionCookie(): Promise<void> {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
  },

  async getSessionUser(): Promise<AuthUser | null> {
    // Cookie o cabecera Bearer (respaldo si el navegador no guarda cookies).
    const { getSessionToken } = await import("@/lib/require-admin");
    const token = await getSessionToken();
    if (!token) return null;
    const payload = await resolveSessionPayload(token);
    if (!payload) return null;

    try {
      const user = await withQueryTimeout(
        getAuthRepository().findById(payload.userId),
        6000,
      );
      if (user?.active) {
        void getAuthRepository().touchLastSeen(user.id);
        return user;
      }
    } catch (err) {
      console.error("[getSessionUser] DB lookup failed, using JWT fallback", err);
    }

    return userFromPayload(payload);
  },

  async getCurrentPublicUser() {
    const user = await this.getSessionUser();
    if (!user) return null;
    return authUserToPublicUser(user);
  },
};
