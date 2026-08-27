import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { persistWebQrInbound } from "@/server/web-qr/inbound";
import { enqueueWebQrInbound } from "@/server/queue/inbound-queue";
import { isQueueEnabled } from "@/server/queue/redis";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { webQrWebhookSecret } from "@/server/web-qr/config";
import type { BridgeInboundPayload } from "@/server/web-qr/types";
import { webQrRepository } from "@/repositories/web-qr.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const expected = webQrWebhookSecret()?.trim();
  const provided = request.headers.get("x-web-qr-webhook-secret")?.trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: {
    type?: string;
    channelId?: string;
    payload?: BridgeInboundPayload;
    sessionData?: Record<string, unknown>;
    phoneNumber?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.type === "session.connected" && body.channelId && body.phoneNumber) {
    const phone = normalizeWhatsAppPhoneDigits(body.phoneNumber);
    await webQrRepository.updateChannelStatus(body.channelId, "CONNECTED", phone);
    await webQrRepository.updateSessionBridge({
      channelId: body.channelId,
      bridgeSessionId: `bridge-${body.channelId}`,
    });
    if (body.sessionData) {
      await webQrRepository.saveSessionData(body.channelId, body.sessionData);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.type === "session.loggedOut" && body.channelId) {
    await webQrRepository.clearWebQrSession(body.channelId);
    return NextResponse.json({ ok: true });
  }

  if (body.type === "session.disconnected" && body.channelId) {
    await webQrRepository.updateChannelStatus(body.channelId, "DISCONNECTED");
    return NextResponse.json({ ok: true });
  }

  if (body.type === "ping") {
    return NextResponse.json({ ok: true, pong: true });
  }

  if (body.type === "message.inbound" && body.payload) {
    if (isQueueEnabled()) {
      try {
        const queued = await enqueueWebQrInbound(body.payload);
        if (queued) {
          return NextResponse.json({ ok: true, queued: true });
        }
      } catch (error) {
        console.error("[POST /api/web-qr/webhook] enqueue:", error);
      }
    }
    try {
      await persistWebQrInbound(body.payload);
    } catch (error) {
      console.error("[POST /api/web-qr/webhook] inbound:", error);
      const message = error instanceof Error ? error.message : "Error persistiendo mensaje QR";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: true });
}
