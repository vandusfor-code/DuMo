import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  createSessionTokenEdge,
  isSecureRequest,
  sessionCookieOptionsEdge,
  verifySessionTokenEdge,
  type EdgeSessionPayload,
} from "@/lib/auth/session-edge";
import { SESSION_RENEW_BEFORE_SEC } from "@/lib/auth/session-constants";

const PUBLIC_PREFIXES = [
  "/login",
  "/logout",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/whatsapp/webhook",
  "/api/system",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const needsAuth =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/leads") ||
    pathname.startsWith("/api/clients") ||
    pathname.startsWith("/api/sales") ||
    pathname.startsWith("/api/commissions") ||
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/whatsapp/send") ||
    pathname.startsWith("/api/users/me") ||
    pathname.startsWith("/api/auth/profile");

  if (!needsAuth) return NextResponse.next();

  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value;
  const headerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const token = cookieToken || headerToken;
  const payload = token ? await verifySessionTokenEdge(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const role = payload.role;
  if (!role) {
    return refreshSessionCookie(request, payload, token!);
  }

  const isAsesora = role === "asesora";
  const home = isAsesora ? "/dashboard" : "/admin";
  const wantsAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const wantsAdvisorArea = pathname.startsWith("/dashboard");

  if ((isAsesora && wantsAdminArea) || (!isAsesora && wantsAdvisorArea)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(home, request.url));
  }

  return refreshSessionCookie(request, payload, token!);
}

/**
 * Extiende la cookie en cada navegación de página. Renueva el JWT solo cuando
 * está cerca de expirar — la sesión no caduca por inactividad.
 */
async function refreshSessionCookie(
  request: NextRequest,
  payload: EdgeSessionPayload,
  currentToken: string,
): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const secure = isSecureRequest(
    request.headers.get("x-forwarded-proto"),
    request.nextUrl.protocol,
  );
  const now = Math.floor(Date.now() / 1000);
  const shouldRenew = payload.exp - now < SESSION_RENEW_BEFORE_SEC;
  const token = shouldRenew
    ? await createSessionTokenEdge(payload.userId, payload.role, payload.companyId)
    : currentToken;

  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptionsEdge(secure));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
