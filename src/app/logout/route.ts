import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { browserRedirectUrl } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cierra sesión (borra cookie) y redirige al login. */
export async function GET(request: NextRequest) {
  const signedOut = request.nextUrl.searchParams.get("signedOut");
  const reason = request.nextUrl.searchParams.get("reason");
  const loginParams: Record<string, string> = {};
  if (signedOut === "1") loginParams.signedOut = "1";
  if (reason) loginParams.reason = reason;

  const res = NextResponse.redirect(browserRedirectUrl(request, "/login", loginParams));
  clearSessionCookie(res);
  return res;
}
