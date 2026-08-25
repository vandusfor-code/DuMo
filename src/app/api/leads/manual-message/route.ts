import { NextResponse, type NextRequest } from "next/server";
import { getTenantScope } from "@/lib/tenant-scope";
import { webQrConversationId } from "@/lib/web-qr/conversation-id";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { leadsService } from "@/services/leads.service";
import { adminLeadsService } from "@/services/admin-leads.service";
import { getConversationRepository } from "@/repositories/conversation.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Envío manual: la asesora tenía al cliente en llamada, le pidió el número y
 * le escribe ella misma por primera vez — no llega por ningún canal entrante.
 * Se manda por la sesión de WhatsApp Web conectada (misma vía que cualquier
 * respuesta normal); lo único distinto es que queda marcada con
 * source='manual_advisor' (bandeja: logo DuMo) y asignada de una vez a quien
 * la creó, sin pasar por el reparto automático.
 */
export async function POST(request: NextRequest) {
  const scope = await getTenantScope();
  if (!scope) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rawPhone = String(body.phone ?? "").trim();
    const name = String(body.name ?? "").trim();
    const text = String(body.text ?? "").trim();

    const digits = normalizeWhatsAppPhoneDigits(rawPhone);
    if (!digits || digits.length < 8) {
      return NextResponse.json({ error: "Número de teléfono inválido." }, { status: 422 });
    }
    if (!text) {
      return NextResponse.json({ error: "Escribe un mensaje." }, { status: 422 });
    }

    const conversationId = webQrConversationId(digits);

    const sent = await leadsService.sendTextMessage({
      conversationId,
      to: digits,
      text,
      companyId: scope.companyId,
    });

    await getConversationRepository().setManualOrigin(conversationId, name || undefined);
    await adminLeadsService.assignAdvisor({ conversationId, advisorId: scope.userId });

    return NextResponse.json({ ok: true, conversationId, messageId: sent.id });
  } catch (error) {
    console.error("[POST /api/leads/manual-message]", error);
    const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
