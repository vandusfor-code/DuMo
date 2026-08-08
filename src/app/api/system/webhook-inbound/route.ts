import { NextResponse } from "next/server";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";
import { defaultPhoneNumberId } from "@/server/whatsapp/credentials";
import {
  phoneIdsFromEnv,
  resolveAllowedPhoneIds,
} from "@/server/whatsapp/webhook-allowlist";
import { webhookVerifyTokens } from "@/server/messenger/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/**
 * Diagnóstico del webhook unificado (WhatsApp + Messenger).
 * No expone secretos — solo configuración y actividad reciente en BD.
 */
export async function GET() {
  const envPhoneIds = phoneIdsFromEnv();
  const allowedForMeta = await resolveAllowedPhoneIds(false);
  const forwardSecretConfigured = Boolean(process.env.WHATSAPP_FORWARD_SECRET?.trim());
  const metaAppSecretConfigured = Boolean(process.env.META_APP_SECRET?.trim());

  let connectedPhoneIds: string[] = [];
  let lastWhatsAppInboundAt: string | null = null;
  let lastWhatsAppPhoneId: string | null = null;
  let whatsAppConversations = 0;
  let messengerConversations = 0;

  if (hasDatabase() && getSql()) {
    await ensureSchema();
    const sql = getSql()!;

    const connectedRows = (await sql`
      SELECT phone_number_id FROM connected_numbers
      WHERE access_token IS NOT NULL AND btrim(access_token) <> ''
    `) as unknown as { phone_number_id: string }[];
    connectedPhoneIds = connectedRows.map((row) => row.phone_number_id);

    const waConvRows = (await sql`
      SELECT COUNT(*)::int AS count
      FROM lead_conversations
      WHERE id NOT LIKE 'messenger:%'
    `) as unknown as { count: number }[];
    whatsAppConversations = waConvRows[0]?.count ?? 0;

    const msConvRows = (await sql`
      SELECT COUNT(*)::int AS count
      FROM lead_conversations
      WHERE id LIKE 'messenger:%'
    `) as unknown as { count: number }[];
    messengerConversations = msConvRows[0]?.count ?? 0;

    const lastWaRows = (await sql`
      SELECT lm.created_at, lc.dumo_phone_id
      FROM lead_messages lm
      JOIN lead_conversations lc ON lc.id = lm.conversation_id
      WHERE lc.id NOT LIKE 'messenger:%' AND lm.direction = 'in'
      ORDER BY lm.created_at DESC
      LIMIT 1
    `) as unknown as { created_at: string; dumo_phone_id: string | null }[];
    lastWhatsAppInboundAt = lastWaRows[0]?.created_at ?? null;
    lastWhatsAppPhoneId = lastWaRows[0]?.dumo_phone_id ?? null;
  }

  const phoneFilterWouldBlockNewNumbers =
    envPhoneIds.length > 0 &&
    connectedPhoneIds.some((id) => !envPhoneIds.includes(id));

  return NextResponse.json({
    ok: forwardSecretConfigured || metaAppSecretConfigured,
    webhookPath: "/api/whatsapp/webhook",
    auth: {
      forwardSecretConfigured,
      metaAppSecretConfigured,
      verifyTokensConfigured: webhookVerifyTokens().length,
    },
    whatsapp: {
      defaultPhoneNumberId: defaultPhoneNumberId(),
      envPhoneFilter: envPhoneIds.map(maskId),
      effectiveAllowList: allowedForMeta.map(maskId),
      phoneFilterActive: allowedForMeta.length > 0,
      phoneFilterWouldBlockNewNumbers,
      dulabsForwardSkipsFilter: true,
      connectedPhoneIds: connectedPhoneIds.map(maskId),
      conversations: whatsAppConversations,
      lastInboundAt: lastWhatsAppInboundAt,
      lastInboundPhoneId: lastWhatsAppPhoneId ? maskId(lastWhatsAppPhoneId) : null,
    },
    messenger: {
      conversations: messengerConversations,
    },
    hints: [
      phoneFilterWouldBlockNewNumbers
        ? "WHATSAPP_PHONE_NUMBER_IDS tiene IDs viejos; actualízalo en Vercel o déjalo vacío. Los reenvíos de dulabs ya no se filtran."
        : null,
      !forwardSecretConfigured
        ? "Falta WHATSAPP_FORWARD_SECRET — dulabs no puede reenviar a DuMo."
        : null,
      !metaAppSecretConfigured
        ? "Falta META_APP_SECRET — eventos directos de Meta (Messenger) recibirán 401."
        : null,
      envPhoneIds.length === 0
        ? "WHATSAPP_PHONE_NUMBER_IDS vacío: DuMo acepta todos los phone_number_id en webhooks de Meta."
        : null,
    ].filter(Boolean),
  });
}
