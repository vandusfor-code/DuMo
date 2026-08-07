import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { leadsService } from "@/services/leads.service";
import { persistMessengerInbound } from "@/server/messenger/inbound";
import {
  allowedMessengerPageIds,
  getMessengerIntegrationConfig,
  messengerVerifyToken,
} from "@/server/messenger/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNSUPPORTED_TYPE_LABELS: Record<string, string> = {
  document: "documentos",
  video: "videos",
  audio: "audios",
  sticker: "stickers",
  location: "ubicaciones",
  contacts: "contactos",
  interactive: "mensajes interactivos",
  button: "botones",
  reaction: "reacciones",
  order: "pedidos",
  system: "mensajes del sistema",
  unknown: "este tipo de contenido",
};

function unsupportedBody(type: string): string {
  const label = UNSUPPORTED_TYPE_LABELS[type] ?? UNSUPPORTED_TYPE_LABELS.unknown;
  return `⚠️ DuMo no admite ${label}. Pide al cliente que envíe texto o una imagen.`;
}

function imageDownloadFailedBody(): string {
  return "⚠️ No se pudo recibir la imagen. Pide al cliente que la reenvíe.";
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const verifyToken = messengerVerifyToken();

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

function allowedPhoneIds(): string[] {
  return (process.env.WHATSAPP_PHONE_NUMBER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type WaImagePayload = {
  id?: string;
  mime_type?: string;
  caption?: string;
};

type WaMessage = {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: WaImagePayload;
};

async function persistInboundMessage(input: {
  msg: WaMessage;
  phoneId?: string;
  customerName: string;
}) {
  const { msg, phoneId, customerName } = input;
  if (!msg.from || !msg.id) return;

  const createdAt = msg.timestamp
    ? new Date(Number(msg.timestamp) * 1000).toISOString()
    : new Date().toISOString();

  const base = {
    waMessageId: msg.id,
    conversationId: msg.from,
    phone: msg.from,
    customerName,
    direction: "in" as const,
    createdAt,
    dumoPhoneId: phoneId,
  };

  const type = msg.type ?? "text";

  if (type === "text" && msg.text?.body) {
    await leadsService.receiveMessage({
      ...base,
      body: msg.text.body,
      messageType: "text",
    });
    return;
  }

  if (type === "image" && msg.image?.id) {
    try {
      await leadsService.receiveInboundImage({
        ...base,
        waMediaId: msg.image.id,
        caption: msg.image.caption,
        mimeType: msg.image.mime_type,
      });
      return;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[webhook] inbound image failed", { messageId: msg.id, detail, error });
      await leadsService.receiveMessage({
        ...base,
        body: imageDownloadFailedBody(),
        messageType: "text",
      });
      return;
    }
  }

  if (type !== "text") {
    console.warn("[webhook] unsupported message type", { type, messageId: msg.id, from: msg.from });
    await leadsService.receiveMessage({
      ...base,
      body: unsupportedBody(type),
      messageType: "text",
    });
    return;
  }

  if (msg.text?.body) {
    await leadsService.receiveMessage({ ...base, body: msg.text.body, messageType: "text" });
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  const authorized =
    hasValidMetaSignature(rawBody, signature) || hasValidForwardSecret(request);
  if (!authorized) {
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
        changes?: {
          value?: {
            metadata?: { phone_number_id?: string };
            contacts?: { profile?: { name?: string }; wa_id?: string }[];
            messages?: WaMessage[];
          };
        }[];
      }>;
    };

    if (payload.object === "page") {
      const messengerConfig = await getMessengerIntegrationConfig();
      const allowedPages = new Set(
        [...allowedMessengerPageIds(), messengerConfig?.pageId].filter(Boolean) as string[],
      );

      for (const entry of payload.entry ?? []) {
        const pageId = entry.id ?? "";
        if (allowedPages.size > 0 && pageId && !allowedPages.has(pageId)) {
          console.warn("[webhook] ignored messenger page_id", pageId);
          continue;
        }

        for (const event of entry.messaging ?? []) {
          await persistMessengerInbound(event, pageId);
        }
      }

      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    }

    const allow = allowedPhoneIds();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const phoneId = change.value?.metadata?.phone_number_id;
        if (allow.length > 0 && phoneId && !allow.includes(phoneId)) {
          console.warn("[webhook] ignored phone_number_id", phoneId);
          continue;
        }

        const contact = change.value?.contacts?.[0];
        for (const msg of change.value?.messages ?? []) {
          await persistInboundMessage({
            msg,
            phoneId,
            customerName: contact?.profile?.name ?? "",
          });
        }
      }
    }
  } catch (error) {
    console.error("[POST /api/whatsapp/webhook] parse", error);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
