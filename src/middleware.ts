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

  // ── Separación por rol ──────────────────────────────────────────────
  // Sesiones antiguas no llevan rol: se fuerza un re-login para obtener un
  // token con rol y poder separar correctamente admin / asesora.
  const role = payload.role;
  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión expirada." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
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

  const isAsesora = role === "asesora";
  const home = isAsesora ? "/dashboard" : "/admin";
  const wantsAdminArea =
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const wantsAdvisorArea = pathname.startsWith("/dashboard");

  // Una asesora no entra al área admin; un admin/supervisor no usa el área de
  // asesoras: cada quien va a su propio home.
  if ((isAsesora && wantsAdminArea) || (!isAsesora && wantsAdvisorArea)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Renueva la cookie solo en navegación de páginas (no en cada API fetch).
  if (!pathname.startsWith("/api/")) {
    const secure = isSecureRequest(
      request.headers.get("x-forwarded-proto"),
      request.nextUrl.protocol,
    );
    const freshToken = await createSessionTokenEdge(payload.userId, role);
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, freshToken, sessionCookieOptionsEdge(secure));
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
