import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de WhatsApp Cloud API.
 *
 * GET  -> verificación inicial de Meta (hub.challenge).
 * POST -> mensajes entrantes de los leads. Valida la firma con META_APP_SECRET
 *         y (por ahora) registra los mensajes. El siguiente paso es persistir
 *         estos mensajes y reemplazar el MockLeadRepository por datos reales.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!signature?.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!isValidSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      entry?: {
        changes?: {
          value?: {
            metadata?: { phone_number_id?: string };
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
            messages?: {
              from?: string;
              id?: string;
              timestamp?: string;
              type?: string;
              text?: { body?: string };
            }[];
          };
        }[];
      }[];
    };

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const messages = change.value?.messages ?? [];
        for (const msg of messages) {
          // TODO: persistir el mensaje entrante (BD) y refrescar la bandeja.
          console.info("[whatsapp/webhook] mensaje", {
            from: msg.from,
            type: msg.type,
            text: msg.text?.body,
          });
        }
      }
    }
  } catch (error) {
    console.error("[POST /api/whatsapp/webhook] parse", error);
    // Respondemos 200 igual para que Meta no reintente en bucle.
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
