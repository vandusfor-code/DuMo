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
    // IMPORTANTE: NO se borra la cookie aquí. Antes, un solo 401 (un fallo
    // puntual de verificación) destruía la sesión y el usuario quedaba fuera
    // sin haber pulsado "Cerrar sesión". La cookie solo se borra en /logout.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  // ── Separación por rol ──────────────────────────────────────────────
  // REGLA: la sesión solo termina cuando el usuario pulsa "Cerrar sesión".
  // Si el token no trae rol (sesión emitida por un flujo antiguo), se deja
  // pasar sin aplicar separación — NUNCA se cierra la sesión por eso.
  const role = payload.role;
  if (!role) {
    return refreshSession(request, payload.userId, undefined);
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

  return refreshSession(request, payload.userId, role);
}

/**
 * Renueva la cookie de sesión en la navegación de páginas (no en cada fetch de
 * API) para que la sesión se mantenga viva mientras se usa la aplicación.
 */
async function refreshSession(
  request: NextRequest,
  userId: string,
  role: string | undefined,
): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const secure = isSecureRequest(
    request.headers.get("x-forwarded-proto"),
    request.nextUrl.protocol,
  );
  const freshToken = await createSessionTokenEdge(userId, role);
  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, freshToken, sessionCookieOptionsEdge(secure));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
