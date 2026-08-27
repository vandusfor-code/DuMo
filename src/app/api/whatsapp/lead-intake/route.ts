import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getSql, ensureSchema } from "@/server/db/client";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { adminLeadsService } from "@/services/admin-leads.service";
import { maybeSendNewLeadWelcome } from "@/services/new-lead-welcome.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function hasValidLeadIntakeSecret(request: NextRequest): boolean {
  const expected = process.env.DULABS_LEAD_INTAKE_SECRET;
  const provided = request.headers.get("x-dulabs-lead-secret");
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

type LeadIntakePayload = {
  dulabs_session_id?: string;
  dulabs_tenant_id?: string;
  phone_number_id?: string;
  wa_id?: string;
  customer_name?: string | null;
  rut?: string | null;
  phone_provided?: string | null;
  current_company_raw?: string | null;
  current_operator?: string | null;
  campaign_id?: string | number | null;
  campaign_name?: string | null;
  captured_at?: string | null;
  status?: string;
};

function resumenLead(payload: LeadIntakePayload): string {
  // El nombre real de la campaña/plantilla (payload.campaign_name) queda
  // guardado en lead_conversations.campaign_name para reportes, pero acá se
  // muestra siempre "Masivos DuMo" -- a la asesora no le sirve saber si fue
  // masivo_wom o cualquier otra plantilla de prueba, solo que es un lead de
  // campaña masiva.
  const lineas = ["🎯 Lead capturado por la campaña Masivos DuMo"];
  if (payload.rut) lineas.push(`📄 RUT: ${payload.rut}`);
  if (payload.phone_provided) lineas.push(`📱 Teléfono: ${payload.phone_provided}`);
  if (payload.current_company_raw) lineas.push(`📡 Compañía actual: ${payload.current_company_raw}`);
  lineas.push("", "Por favor, envíale un mensaje de saludo inicial y continúa la gestión de este lead.");
  return lineas.join("\n");
}

export async function POST(request: NextRequest) {
  if (!hasValidLeadIntakeSecret(request)) {
    console.warn("[POST /api/whatsapp/lead-intake] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: LeadIntakePayload;
  try {
    payload = (await request.json()) as LeadIntakePayload;
  } catch (error) {
    console.error("[POST /api/whatsapp/lead-intake] parse", error);
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!payload.dulabs_session_id || !payload.wa_id) {
    return NextResponse.json({ error: "Faltan 'dulabs_session_id' o 'wa_id'" }, { status: 400 });
  }

  await ensureSchema();
  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
  }

  // Idempotencia: si este dulabs_session_id ya se procesó (reintento del
  // lado de dulabs), devolvemos la conversación ya existente sin volver a
  // tocarla -- no vuelve a incrementar unread, no dispara auto-assign de
  // nuevo sobre algo que ya se asignó.
  const existente = (await sql`
    SELECT id, assigned_advisor_id FROM lead_conversations WHERE dulabs_session_id = ${payload.dulabs_session_id}
  `) as unknown as { id: string; assigned_advisor_id: string | null }[];
  if (existente[0]) {
    // Backfill seguro para leads ya procesados antes de estas correcciones
    // -- no toca nada más, no reactiva auto-assign.
    if (payload.phone_number_id) {
      await sql`
        UPDATE lead_conversations SET dumo_phone_id = ${payload.phone_number_id}
        WHERE id = ${existente[0].id} AND dumo_phone_id IS NULL
      `;
    }
    // Corrige leads creados antes del fix de phone (ver comentario abajo):
    // el campo debe ser siempre el wa_id real, nunca el phone_provided del
    // formulario.
    await sql`
      UPDATE lead_conversations SET phone = id
      WHERE id = ${existente[0].id} AND phone IS DISTINCT FROM id
    `;
    return NextResponse.json({
      ok: true,
      conversation_id: existente[0].id,
      assigned_advisor_id: existente[0].assigned_advisor_id,
      already_processed: true,
    });
  }

  const conversationId = normalizeWhatsAppPhoneDigits(payload.wa_id);
  if (!conversationId) {
    return NextResponse.json({ error: "wa_id inválido" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  await getConversationRepository().saveMessage({
    waMessageId: `dulabs-lead-${payload.dulabs_session_id}`,
    conversationId,
    // SIEMPRE el wa_id real (mismo criterio que un inbound real de
    // WhatsApp, ver inbound-persist.ts: phone = msg.from = conversationId).
    // NO usar phone_provided -- ese es un dato del formulario del lead (el
    // cliente puede escribir un número distinto al que está chateando), y
    // la UI usa este campo `phone` como destino real al enviar
    // (chat-window.tsx: <ChatInput to={conversation.phone} />). Ponerlo mal
    // manda la respuesta de la asesora a un número equivocado.
    phone: conversationId,
    customerName: payload.customer_name ?? "",
    body: resumenLead(payload),
    direction: "in",
    createdAt: payload.captured_at ?? nowIso,
    messageType: "text",
    // Sin esto la asesora no puede responder ("Falta phone_number_id para
    // enviar"): DuMo necesita saber por cuál número de WhatsApp conectado
    // debe salir la respuesta -- el mismo que usó la campaña.
    dumoPhoneId: payload.phone_number_id,
  });

  await sql`
    UPDATE lead_conversations
    SET
      rut = COALESCE(${payload.rut ?? null}, rut),
      source = 'dulabs_campaign',
      campaign_id = ${payload.campaign_id != null ? String(payload.campaign_id) : null},
      campaign_name = ${payload.campaign_name ?? null},
      current_operator = COALESCE(${payload.current_operator ?? null}, current_operator),
      dulabs_session_id = ${payload.dulabs_session_id}
    WHERE id = ${conversationId}
  `;

  // Mismo punto de entrada que usa cualquier mensaje entrante real
  // (src/services/leads.service.ts) -- no se reimplementa la asignación,
  // se reutiliza la única que existe en el sistema.
  const priorAssign = (await sql`
    SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${conversationId}
  `) as unknown as { assigned_advisor_id: string | null }[];
  const hadAdvisor = Boolean(priorAssign[0]?.assigned_advisor_id);

  await adminLeadsService.autoAssignIfNeeded(conversationId);

  if (!hadAdvisor) {
    await maybeSendNewLeadWelcome(conversationId).catch((err) =>
      console.error("[POST /api/whatsapp/lead-intake] maybeSendNewLeadWelcome", err),
    );
  }

  const asignado = (await sql`
    SELECT assigned_advisor_id FROM lead_conversations WHERE id = ${conversationId}
  `) as unknown as { assigned_advisor_id: string | null }[];

  return NextResponse.json({
    ok: true,
    conversation_id: conversationId,
    assigned_advisor_id: asignado[0]?.assigned_advisor_id ?? null,
    already_processed: false,
  });
}
