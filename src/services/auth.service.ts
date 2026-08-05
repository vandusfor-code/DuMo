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
} from "@/lib/auth/session-cookie";
import type { AuthUser, LoginResult } from "@/types/auth";

export const authService = {
  async login(login: string, password: string): Promise<LoginResult | null> {
    const repo = getAuthRepository();
    await repo.ensureSeedAdmin();
    const user = await repo.authenticate(login, password);
    if (!user) return null;
    return { user, redirectTo: redirectForRole(user.role) };
  },

  async setSessionCookie(userId: string): Promise<void> {
    const token = createSessionToken(userId);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  },

  async clearSessionCookie(): Promise<void> {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
  },

  async getSessionUser(): Promise<AuthUser | null> {
    const jar = await cookies();
    const token = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const user = await getAuthRepository().findById(payload.userId);
    if (user) {
      void getAuthRepository().touchLastSeen(user.id);
    }
    return user;
  },

  async getCurrentPublicUser() {
    const user = await this.getSessionUser();
    if (!user) return null;
    return authUserToPublicUser(user);
  },
};
