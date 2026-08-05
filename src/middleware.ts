import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";

const PUBLIC_PREFIXES = [
  "/login",
  "/logout",
  "/api/auth",
  "/api/whatsapp/webhook",
  "/api/system",
];

export function middleware(request: NextRequest) {
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
    pathname.startsWith("/api/whatsapp/send") ||
    pathname.startsWith("/api/users/me");

  if (!needsAuth) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
