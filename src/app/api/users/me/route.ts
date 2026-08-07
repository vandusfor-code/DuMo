import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import { authService } from "@/services/auth.service";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth/session-cookie";
import { isSecureRequest } from "@/lib/auth/session-edge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

/** Perfil del usuario conectado + token fresco para sincronizar fetch en el cliente. */
export async function GET(request: NextRequest) {
  try {
    const user = await authService.getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const token = createSessionToken(user.id, user.role, user.companyId);
    const secure = isSecureRequest(
      request.headers.get("x-forwarded-proto"),
      request.nextUrl.protocol,
    );
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(secure));

    return NextResponse.json({
      ...authUserToPublicUser(user),
      sessionToken: token,
    });
  } catch (error) {
    console.error("[GET /api/users/me]", error);
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
}
