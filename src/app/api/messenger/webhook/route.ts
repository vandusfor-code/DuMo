import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { persistMessengerInbound } from "@/server/messenger/inbound";
import {
  allowedMessengerPageIds,
  getMessengerIntegrationConfig,
  matchesWebhookVerifyToken,
} from "@/server/messenger/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function hasValidMetaSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(signature, expected);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode === "subscribe" && matchesWebhookVerifyToken(token)) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!hasValidMetaSignature(rawBody, signature)) {
    console.warn("[webhook/messenger] unauthorized POST");
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

    if (payload.object !== "page") {
      console.warn("[webhook/messenger] ignored object", payload.object ?? null);
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const messengerConfig = await getMessengerIntegrationConfig();
    const allowedPages = new Set(
      [...allowedMessengerPageIds(), messengerConfig?.pageId].filter(Boolean) as string[],
    );

    let inboundCount = 0;
    for (const entry of payload.entry ?? []) {
      const pageId = entry.id ?? "";
      if (allowedPages.size > 0 && pageId && !allowedPages.has(pageId)) {
        console.warn("[webhook/messenger] ignored page_id", {
          received: pageId,
          allowed: [...allowedPages],
        });
        continue;
      }

      for (const event of entry.messaging ?? []) {
        await persistMessengerInbound(event, pageId);
        inboundCount += 1;
      }
    }

    if (inboundCount > 0) {
      console.info("[webhook/messenger] inbound events", { inboundCount });
    }
  } catch (error) {
    console.error("[POST /api/messenger/webhook] parse", error);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
