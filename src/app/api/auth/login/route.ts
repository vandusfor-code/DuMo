import { NextResponse, type NextRequest } from "next/server";
import { authService } from "@/services/auth.service";
import { authUserToPublicUser } from "@/repositories/auth.repository";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth/session-cookie";
import { isSecureRequest } from "@/lib/auth/session-edge";

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

    // El rol viaja en el token para que el middleware separe admin/asesora.
    const token = createSessionToken(result.user.id, result.user.role, result.user.companyId);
    const secure = isSecureRequest(
      request.headers.get("x-forwarded-proto"),
      request.nextUrl.protocol,
    );
    const cookieOpts = sessionCookieOptions(secure);
    const response = NextResponse.json({
      user: authUserToPublicUser(result.user),
      redirectTo: result.redirectTo,
      // Respaldo para navegadores que no guardan la cookie: el cliente lo
      // manda como Authorization: Bearer en cada petición.
      token,
    });
    response.cookies.set(SESSION_COOKIE, token, cookieOpts);
    return response;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    const message =
      error instanceof Error ? error.message : "No se pudo iniciar sesión.";
    const isDev = process.env.NODE_ENV === "development";
    const isDbConfig =
      message.includes("DATABASE_URL") || message.includes("Base de datos no configurada");
    if (isDev && isDbConfig) {
      return NextResponse.json(
        {
          error:
            "Base de datos no configurada en local. Agrega DATABASE_URL1 a .env.local (ejecuta: node scripts/sync-local-postgres-env.mjs) y reinicia npm run dev.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "No se pudo iniciar sesión." }, { status: 500 });
  }
}
