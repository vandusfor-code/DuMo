import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { getConversationRepository } from "@/repositories/conversation.repository";
import { getSql, ensureSchema } from "@/server/db/client";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { adminLeadsService } from "@/services/admin-leads.service";

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
  const lineas = [`🎯 Lead capturado por campaña${payload.campaign_name ? ` "${payload.campaign_name}"` : ""}`];
  if (payload.rut) lineas.push(`📄 RUT: ${payload.rut}`);
  if (payload.phone_provided) lineas.push(`📱 Teléfono: ${payload.phone_provided}`);
  if (payload.current_company_raw) lineas.push(`📡 Compañía actual: ${payload.current_company_raw}`);
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
    phone: payload.phone_provided || conversationId,
    customerName: payload.customer_name ?? "",
    body: resumenLead(payload),
    direction: "in",
    createdAt: payload.captured_at ?? nowIso,
    messageType: "text",
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
  await adminLeadsService.autoAssignIfNeeded(conversationId);

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
