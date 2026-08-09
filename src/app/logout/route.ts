import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { browserRedirectUrl } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cierra sesión (borra cookie) y redirige al login. */
export async function GET(request: NextRequest) {
  const res = NextResponse.redirect(
    browserRedirectUrl(request, "/login", { signedOut: "1" }),
  );
  clearSessionCookie(res);
  return res;
}
