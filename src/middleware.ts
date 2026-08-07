import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  createSessionTokenEdge,
  isSecureRequest,
  isSessionTokenExpired,
  peekSessionTokenPayload,
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

const STATIC_FILE =
  /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|eot)$/i;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass temprano: estáticos, chunks Next y peticiones auxiliares de recarga.
  if (shouldBypassMiddleware(request, pathname)) {
    return NextResponse.next();
  }

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

  const token = readSessionToken(request);
  const payload = token ? await verifySessionTokenEdge(token) : null;

  if (!payload) {
    return handleUnauthenticated(request, pathname, token);
  }

  const role = payload.role;
  if (!role) {
    return maybeRenewSessionCookie(request, payload);
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

  return maybeRenewSessionCookie(request, payload);
}

/**
 * Recursos estáticos, RSC/flight y prefetch: nunca redirigen a /login.
 * En recargas rápidas (F5) estas peticiones paralelas pueden llegar sin
 * cookie; ignorarlas evita destruir la sesión del documento principal.
 */
function shouldBypassMiddleware(request: NextRequest, pathname: string): boolean {
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  if (STATIC_FILE.test(pathname)) return true;

  if (request.headers.get("RSC") === "1") return true;
  if (request.headers.get("Next-Router-Prefetch")) return true;
  if (request.headers.get("Next-Router-Segment-Prefetch")) return true;
  if (request.headers.get("Purpose") === "prefetch") return true;

  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest === "script" || dest === "style" || dest === "image" || dest === "font") {
    return true;
  }

  return false;
}

function isDocumentNavigation(request: NextRequest): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.get("RSC") === "1") return false;

  const dest = request.headers.get("Sec-Fetch-Dest");
  if (dest === "document") return true;

  const mode = request.headers.get("Sec-Fetch-Mode");
  const accept = request.headers.get("Accept") ?? "";
  return mode === "navigate" || accept.includes("text/html");
}

function isSessionDefinitelyExpired(token: string | undefined): boolean {
  if (!token) return false;
  const peek = peekSessionTokenPayload(token);
  return peek ? isSessionTokenExpired(peek) : false;
}

/**
 * Solo redirige a /login en navegación document principal cuando no hay sesión
 * recuperable. Peticiones paralelas y tokens no expirados pasan sin redirect.
 */
function handleUnauthenticated(
  request: NextRequest,
  pathname: string,
  token: string | undefined,
): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // RSC, prefetch, subrecursos: nunca redirigir (condición de carrera F5).
  if (shouldBypassMiddleware(request, pathname) || !isDocumentNavigation(request)) {
    return NextResponse.next();
  }

  // Token presente pero verify falló: solo expulsar si expiró de verdad.
  if (token && !isSessionDefinitelyExpired(token)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

/** Cookie HttpOnly (recargas) con respaldo Bearer en peticiones fetch del cliente. */
function readSessionToken(request: NextRequest): string | undefined {
  const cookieToken = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (cookieToken) return cookieToken;

  const headerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  return headerToken || undefined;
}

async function maybeRenewSessionCookie(
  request: NextRequest,
  payload: EdgeSessionPayload,
): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const now = Math.floor(Date.now() / 1000);
  const shouldRenew = payload.exp - now < SESSION_RENEW_BEFORE_SEC;
  if (!shouldRenew) {
    return NextResponse.next();
  }

  const secure = isSecureRequest(
    request.headers.get("x-forwarded-proto"),
    request.nextUrl.protocol,
  );
  const token = await createSessionTokenEdge(payload.userId, payload.role, payload.companyId);

  const res = NextResponse.next();
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptionsEdge(secure));
  return res;
}

export const config = {
  matcher: [
    /*
     * Excluir por completo assets de Next y archivos estáticos comunes.
     * Evita que recargas rápidas disparen auth en .js/.css/.png paralelos.
     */
    "/((?!_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mjs|map|woff|woff2|ttf|eot)$).*)",
  ],
};
