import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./constants";
import { SESSION_MAX_AGE_SEC } from "./session-constants";

export { SESSION_COOKIE };

export type SessionPayload = {
  userId: string;
  exp: number;
  /** Rol del usuario: permite que el middleware separe admin/asesora. */
  role?: string;
  /** Tenant SaaS — empresa del usuario. */
  companyId?: string;
  /** Incrementa al forzar desconexión; debe coincidir con users.token_version. */
  tokenVersion?: number;
};

function secret(): string {
  return process.env.AUTH_SECRET ?? "dumo-dev-auth-secret-change-in-production";
}

export function createSessionToken(
  userId: string,
  role?: string,
  companyId?: string,
  tokenVersion?: number,
): string {
  const payload: SessionPayload = {
    userId,
    role,
    companyId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  if (tokenVersion !== undefined) {
    payload.tokenVersion = tokenVersion;
  }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure?: boolean) {
  const useSecure =
    secure ?? (process.env.VERCEL === "1" || process.env.NODE_ENV === "production");
  return {
    httpOnly: true,
    secure: useSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}

/** Borra la cookie de sesión en una respuesta (Route Handler o middleware). */
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
