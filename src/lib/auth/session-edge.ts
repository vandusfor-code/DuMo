import { SESSION_COOKIE } from "./constants";
import { SESSION_MAX_AGE_SEC } from "./session-constants";

export { SESSION_COOKIE };

function secret(): string {
  return process.env.AUTH_SECRET ?? "dumo-dev-auth-secret-change-in-production";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function sign(body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return toBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type EdgeSessionPayload = {
  userId: string;
  exp: number;
  /** Rol del usuario: permite que el middleware separe admin/asesora. */
  role?: string;
  companyId?: string;
};

export async function verifySessionTokenEdge(
  token: string,
): Promise<EdgeSessionPayload | null> {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await sign(body);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(fromBase64Url(body)) as EdgeSessionPayload;
    if (!payload.userId || !payload.exp) return null;
    if (isSessionTokenExpired(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Decodifica el payload sin verificar firma (solo para decidir expiración en middleware). */
export function peekSessionTokenPayload(token: string): EdgeSessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  try {
    const payload = JSON.parse(fromBase64Url(token.slice(0, dot))) as EdgeSessionPayload;
    if (!payload.userId || !payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isSessionTokenExpired(payload: EdgeSessionPayload): boolean {
  return payload.exp < Math.floor(Date.now() / 1000);
}

export async function createSessionTokenEdge(
  userId: string,
  role?: string,
  companyId?: string,
): Promise<string> {
  const payload: EdgeSessionPayload = {
    userId,
    role,
    companyId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(body);
  return `${body}.${sig}`;
}

export function isSecureRequest(proto: string | null, urlProtocol: string): boolean {
  if (proto) return proto === "https";
  return urlProtocol === "https:";
}

export function sessionCookieOptionsEdge(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
