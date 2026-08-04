import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH = "https://graph.facebook.com";

/**
 * Completa el Embedded Signup de coexistencia:
 *  1. Intercambia el `code` (devuelto por FB.login) por un access token.
 *  2. Suscribe la app al WABA para recibir webhooks de ese número.
 *
 * El App Secret vive solo aquí (servidor). No devolvemos el token al cliente.
 * Para enviar mensajes luego, usa un token permanente de System User en
 * `WHATSAPP_TOKEN` (recomendado para un número propio).
 */
export async function POST(request: NextRequest) {
  const appId = process.env.META_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const version = process.env.META_GRAPH_VERSION ?? "v21.0";

  if (!appId || !appSecret) {
    return NextResponse.json(
      { error: "Faltan META_APP_ID / META_APP_SECRET en el servidor." },
      { status: 500 },
    );
  }

  let body: { code?: string; phoneNumberId?: string; wabaId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { code, phoneNumberId, wabaId } = body;
  if (!code) {
    return NextResponse.json({ error: "Falta el code de Meta." }, { status: 422 });
  }

  try {
    // 1) code -> access token
    const tokenUrl =
      `${GRAPH}/${version}/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: { message?: string };
    };
    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        { error: tokenJson.error?.message ?? "No se pudo obtener el token." },
        { status: 502 },
      );
    }
    const accessToken = tokenJson.access_token;

    // 2) suscribir la app al WABA (para que lleguen los webhooks del número)
    if (wabaId) {
      await fetch(`${GRAPH}/${version}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }

    console.info("[whatsapp/connect] conectado", { wabaId, phoneNumberId });
    return NextResponse.json({ ok: true, wabaId, phoneNumberId });
  } catch (error) {
    console.error("[POST /api/whatsapp/connect]", error);
    return NextResponse.json(
      { error: "Error completando la conexión con Meta." },
      { status: 500 },
    );
  }
}
