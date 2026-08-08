import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { resolveAllowedPhoneIds } from "@/server/whatsapp/webhook-allowlist";
import { enqueueWhatsAppInbound } from "@/server/queue/inbound-queue";
import { isQueueEnabled } from "@/server/queue/redis";
import {
  persistWhatsAppInboundMessage,
  type WhatsAppInboundMessage,
} from "@/server/whatsapp/inbound-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

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

function hasValidForwardSecret(request: NextRequest): boolean {
  const expected = process.env.WHATSAPP_FORWARD_SECRET;
  const provided = request.headers.get("x-dumo-forward-secret");
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

type WaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { profile?: { name?: string }; wa_id?: string }[];
        messages?: WhatsAppInboundMessage[];
      };
    }[];
  }>;
};

async function processPayload(payload: WaWebhookPayload, forwardedFromDulabs: boolean) {
  const allow = await resolveAllowedPhoneIds(forwardedFromDulabs);
  const useQueue = isQueueEnabled();
  let inboundCount = 0;
  let ignoredPhoneIds = 0;
  let queuedCount = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneId = change.value?.metadata?.phone_number_id;
      if (allow.length > 0 && phoneId && !allow.includes(phoneId)) {
        ignoredPhoneIds += 1;
        continue;
      }

      const contact = change.value?.contacts?.[0];
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        inboundCount += 1;
        const customerName = contact?.profile?.name ?? "";
        if (useQueue) {
          const queued = await enqueueWhatsAppInbound({ msg, phoneId, customerName });
          if (queued) {
            queuedCount += 1;
            continue;
          }
        }
        await persistWhatsAppInboundMessage({ msg, phoneId, customerName });
      }
    }
  }

  if (inboundCount > 0 || ignoredPhoneIds > 0) {
    console.info("[webhook/whatsapp]", {
      source: forwardedFromDulabs ? "dulabs" : "meta",
      object: payload.object ?? null,
      inboundCount,
      queuedCount,
      ignoredPhoneIds,
      queueEnabled: useQueue,
    });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const forwardedFromDulabs = hasValidForwardSecret(request);

  const authorized =
    hasValidMetaSignature(rawBody, signature) || forwardedFromDulabs;
  if (!authorized) {
    console.warn("[webhook/whatsapp] unauthorized POST", {
      hasSignature: Boolean(signature),
      forwardedFromDulabs,
    });
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: WaWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WaWebhookPayload;
  } catch (error) {
    console.error("[POST /api/whatsapp/webhook] parse", error);
    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  }

  void processPayload(payload, forwardedFromDulabs).catch((error) => {
    console.error("[POST /api/whatsapp/webhook] process", error);
  });

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
