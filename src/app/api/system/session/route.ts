import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico de sesión: dice si la cookie llega al servidor y si el token
 * verifica. NO expone el token ni el secreto — solo longitudes y estado.
 * Es público (bajo /api/system) para poder diagnosticar sin sesión válida.
 */
export async function GET(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const allCookies = request.cookies.getAll().map((c) => c.name);

  if (!raw) {
    return NextResponse.json({
      cookieRecibida: false,
      cookiesPresentes: allCookies,
      diagnostico:
        "El navegador NO está enviando la cookie de sesión en las peticiones a la API.",
    });
  }

  const payload = verifySessionToken(raw);
  return NextResponse.json({
    cookieRecibida: true,
    longitudToken: raw.length,
    cookiesPresentes: allCookies,
    tokenValido: Boolean(payload),
    payload: payload
      ? {
          userId: payload.userId,
          role: payload.role ?? "(sin rol)",
          expiraEn: new Date(payload.exp * 1000).toISOString(),
          expirado: payload.exp < Math.floor(Date.now() / 1000),
        }
      : null,
    authSecretConfigurado: Boolean(process.env.AUTH_SECRET),
    diagnostico: payload
      ? "La cookie llega y el token es válido."
      : "La cookie llega pero el token NO verifica (firma inválida o expirado).",
  });
}
