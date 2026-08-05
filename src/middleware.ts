import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  createSessionTokenEdge,
  isSecureRequest,
  sessionCookieOptionsEdge,
  verifySessionTokenEdge,
} from "@/lib/auth/session-edge";

const PUBLIC_PREFIXES = [
  "/login",
  "/logout",
  "/api/auth",
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
    pathname.startsWith("/api/sales") ||
    pathname.startsWith("/api/commissions") ||
    pathname.startsWith("/api/dashboard") ||
    pathname.startsWith("/api/whatsapp/send") ||
    pathname.startsWith("/api/users/me") ||
    pathname.startsWith("/api/auth/profile");

  if (!needsAuth) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySessionTokenEdge(token) : null;

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "No autenticado." }, { status: 401 });
      res.cookies.set(SESSION_COOKIE, "", {
        ...sessionCookieOptionsEdge(
          isSecureRequest(
            request.headers.get("x-forwarded-proto"),
            request.nextUrl.protocol,
          ),
        ),
        maxAge: 0,
        expires: new Date(0),
      });
      return res;
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    const res = NextResponse.redirect(login);
    res.cookies.set(SESSION_COOKIE, "", {
      ...sessionCookieOptionsEdge(
        isSecureRequest(
          request.headers.get("x-forwarded-proto"),
          request.nextUrl.protocol,
        ),
      ),
      maxAge: 0,
      expires: new Date(0),
    });
    return res;
  }

  // Renueva la cookie en cada navegación para que F5 no pierda la sesión.
  const secure = isSecureRequest(
    request.headers.get("x-forwarded-proto"),
    request.nextUrl.protocol,
  );
  const freshToken = await createSessionTokenEdge(payload.userId);
  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, freshToken, sessionCookieOptionsEdge(secure));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
