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
import {
  assertSessionNotRevoked,
  canUseJwtFallback,
  SessionRevokedError,
} from "@/lib/auth/resolve-session-user";
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
    const user = await withQueryTimeout(
      getAuthRepository().authenticate(login, password),
      6_000,
    );
    if (!user) return null;
    return { user, redirectTo: redirectForRole(user.role) };
  },

  async setSessionCookie(
    userId: string,
    role?: string,
    companyId?: string,
    tokenVersion?: number,
  ): Promise<void> {
    // El rol debe viajar siempre en el token: un token sin rol deja la sesión
    // sin separación admin/asesora.
    const token = createSessionToken(userId, role, companyId, tokenVersion);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  },

  async clearSessionCookie(): Promise<void> {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
  },

  async getSessionUser(): Promise<AuthUser | null> {
    const { getSessionToken } = await import("@/lib/require-admin");
    const token = await getSessionToken();
    if (!token) return null;
    return this.getSessionUserFromToken(token);
  },

  async getSessionUserFromToken(token: string): Promise<AuthUser | null> {
    const payload = await resolveSessionPayload(token);
    if (!payload) return null;

    try {
      const user = await withQueryTimeout(
        getAuthRepository().findById(payload.userId),
        6000,
      );
      if (!user?.active) return null;
      assertSessionNotRevoked(payload, user);
      void getAuthRepository().touchLastSeen(user.id);
      return user;
    } catch (err) {
      if (err instanceof SessionRevokedError) {
        return null;
      }
      if (!canUseJwtFallback(payload)) {
        console.error("[getSessionUser] DB lookup failed — no JWT fallback (tokenVersion present)", err);
        return null;
      }
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
