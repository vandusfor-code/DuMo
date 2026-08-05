import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const login = String(body.login ?? body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!login || !password) {
      return NextResponse.json(
        { error: "Correo/usuario y contraseña son obligatorios." },
        { status: 400 },
      );
    }

    const result = await authService.login(login, password);
    if (!result) {
      return NextResponse.json(
        { error: "Credenciales incorrectas. Verifica tu correo o usuario y contraseña." },
        { status: 401 },
      );
    }

    const token = createSessionToken(result.user.id);
    const res = NextResponse.json({
      user: authUserToPublicUser(result.user),
      redirectTo: result.redirectTo,
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
