import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionTokenEdge } from "@/lib/auth/session-edge";

// TEMPORAL — BORRAR DESPUÉS DEL DIAGNÓSTICO (bloque debug-secret-edge más abajo)

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

  // TEMPORAL — BORRAR DESPUÉS DEL DIAGNÓSTICO
  if (pathname === "/api/system/debug-secret-edge") {
    const secret = process.env.AUTH_SECRET ?? "dumo-dev-auth-secret-change-in-production";
    const enc = new TextEncoder().encode(secret);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const fingerprint = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 12);
    return NextResponse.json({
      runtime: "edge",
      hasEnvVar: !!process.env.AUTH_SECRET,
      length: secret.length,
      fingerprint,
    });
  }

  if (
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return NextResponse.next();
  }

  const isProtectedPage =
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  if (!isProtectedPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const payload = await verifySessionTokenEdge(token);

  if (payload !== null) {
    const role = payload.role;
    if (role) {
      const isAsesora = role === "asesora";
      const home = isAsesora ? "/dashboard" : "/admin";
      const wantsAdminArea = pathname.startsWith("/admin");
      const wantsAdvisorArea = pathname.startsWith("/dashboard");

      if ((isAsesora && wantsAdminArea) || (!isAsesora && wantsAdvisorArea)) {
        return NextResponse.redirect(new URL(home, request.url));
      }
    }

    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
