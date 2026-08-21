import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { persistInstagramInbound } from "@/server/instagram/inbound";
import {
  allowedInstagramUserIds,
  getInstagramIntegrationConfig,
  matchesInstagramWebhookVerifyToken,
} from "@/server/instagram/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * La app de Meta que respalda Instagram puede ser distinta de la que ya
 * firma el webhook de Messenger — se prueba primero INSTAGRAM_APP_SECRET
 * (el "Clave secreta de la app" que se ve en el panel de Meta para esta
 * app) y, si no está definido, se cae a META_APP_SECRET por si comparten
 * la misma app.
 */
function hasValidMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const secrets = [process.env.INSTAGRAM_APP_SECRET, process.env.META_APP_SECRET]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s));
  return secrets.some((secret) => {
    const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(signature, expected);
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && matchesInstagramWebhookVerifyToken(token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!hasValidMetaSignature(rawBody, signature)) {
    console.warn("[webhook/instagram] unauthorized POST");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      object?: string;
      entry?: Array<{
        id?: string;
        messaging?: Array<{
          sender?: { id?: string };
          recipient?: { id?: string };
          timestamp?: number;
          message?: { mid?: string; text?: string; is_echo?: boolean };
        }>;
      }>;
    };

    if (payload.object !== "instagram") {
      console.warn("[webhook/instagram] ignored object", payload.object ?? null);
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const igConfig = await getInstagramIntegrationConfig();
    const allowedUsers = new Set(
      [...allowedInstagramUserIds(), igConfig?.igUserId].filter(Boolean) as string[],
    );

    let inboundCount = 0;
    let persistedCount = 0;
    for (const entry of payload.entry ?? []) {
      const igUserId = entry.id ?? "";
      if (allowedUsers.size > 0 && igUserId && !allowedUsers.has(igUserId)) {
        console.warn("[webhook/instagram] ignored ig_user_id", {
          received: igUserId,
          allowed: [...allowedUsers],
        });
        continue;
      }

      for (const event of entry.messaging ?? []) {
        inboundCount += 1;
        const persisted = await persistInstagramInbound(event, igUserId);
        if (persisted) persistedCount += 1;
      }
    }

    if (inboundCount > 0) {
      console.info("[webhook/instagram] inbound events", { inboundCount, persistedCount });
    }
  } catch (error) {
    console.error("[POST /api/instagram/webhook] parse", error);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
