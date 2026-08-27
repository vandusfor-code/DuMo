import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "dumo_session";

function secret() {
  return process.env.AUTH_SECRET ?? "dumo-dev-auth-secret-change-in-production";
}

/** @param {string} token */
export function verifySessionToken(token) {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** @param {string | undefined} cookieHeader */
export function sessionFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq);
    if (name !== SESSION_COOKIE) continue;
    const value = trimmed.slice(eq + 1);
    return verifySessionToken(decodeURIComponent(value));
  }
  return null;
}

/** @param {import("socket.io").Socket} socket */
export function sessionFromSocket(socket) {
  const fromAuth =
    typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : null;
  if (fromAuth) {
    const payload = verifySessionToken(fromAuth);
    if (payload) return payload;
  }
  return sessionFromCookieHeader(socket.handshake.headers.cookie);
}
