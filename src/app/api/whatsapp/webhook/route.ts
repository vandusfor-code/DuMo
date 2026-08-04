import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { leadsService } from "@/services/leads.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de WhatsApp — Opción A (una sola Meta App en dulabs).
 *
 * Meta entrega TODO a dulabs (webhook único de la app). dulabs reenvía a este
 * endpoint solo los eventos de los números de DuMo. Por eso aquí aceptamos:
 *   - la firma original de Meta `X-Hub-Signature-256` (si dulabs reenvía el
 *     body crudo + ese header), validada con META_APP_SECRET; o
 *   - un secreto compartido `X-DuMo-Forward-Secret` == WHATSAPP_FORWARD_SECRET
 *     (si dulabs reenvía sin la firma original).
 *
 * El GET (hub.challenge) queda por si algún día Meta apunta directo a DuMo.
 */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

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

/** Números de DuMo permitidos (coma-separados). Vacío = acepta todos. */
function allowedPhoneIds(): string[] {
  return (process.env.WHATSAPP_PHONE_NUMBER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

    const allow = allowedPhoneIds();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const phoneId = change.value?.metadata?.phone_number_id;
        // Ignora números que no son de DuMo (si hay lista de permitidos).
        if (allow.length > 0 && phoneId && !allow.includes(phoneId)) continue;

        const contact = change.value?.contacts?.[0];
        for (const msg of change.value?.messages ?? []) {
          if (!msg.from || !msg.id) continue;
          const createdAt = msg.timestamp
            ? new Date(Number(msg.timestamp) * 1000).toISOString()
            : new Date().toISOString();
          await leadsService.receiveMessage({
            waMessageId: msg.id,
            conversationId: msg.from,
            phone: msg.from,
            customerName: contact?.profile?.name ?? "",
            body: msg.text?.body ?? `[${msg.type ?? "mensaje"}]`,
            direction: "in",
            createdAt,
          });
        }
      }
    }
  } catch (error) {
    console.error("[POST /api/whatsapp/webhook] parse", error);
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
