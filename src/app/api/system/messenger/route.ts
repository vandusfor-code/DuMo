import { NextResponse } from "next/server";
import {
  allowedMessengerPageIds,
  getMessengerIntegrationConfig,
  webhookVerifyTokens,
} from "@/server/messenger/config";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 6) return "••••••";
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/**
 * Diagnóstico de Messenger. No expone tokens — solo si están configurados
 * y cuántas conversaciones messenger hay en BD.
 */
export async function GET() {
  const integration = await getMessengerIntegrationConfig();
  const envPageIds = allowedMessengerPageIds();
  const verifyTokens = webhookVerifyTokens();

  let messengerConversations = 0;
  let lastInboundAt: string | null = null;

  if (hasDatabase() && getSql()) {
    await ensureSchema();
    const rows = (await getSql()!`
      SELECT COUNT(*)::int AS count
      FROM lead_conversations
      WHERE id LIKE 'messenger:%'
    `) as unknown as { count: number }[];
    messengerConversations = rows[0]?.count ?? 0;

    const lastRows = (await getSql()!`
      SELECT lm.created_at
      FROM lead_messages lm
      JOIN lead_conversations lc ON lc.id = lm.conversation_id
      WHERE lc.id LIKE 'messenger:%' AND lm.direction = 'in'
      ORDER BY lm.created_at DESC
      LIMIT 1
    `) as unknown as { created_at: string }[];
    lastInboundAt = lastRows[0]?.created_at ?? null;
  }

  const configuredPageIds = [
    ...new Set([...envPageIds, integration?.pageId].filter(Boolean) as string[]),
  ];

  return NextResponse.json({
    ok: Boolean(integration),
    verifyTokenConfigured: verifyTokens.length > 0,
    verifyTokenCount: verifyTokens.length,
    metaAppSecretConfigured: Boolean(process.env.META_APP_SECRET?.trim()),
    pageAccessTokenConfigured: Boolean(integration),
    pageIdConfigured: configuredPageIds.length > 0,
    configuredPageIds: configuredPageIds.map(mask),
    pageName: integration?.pageName ?? null,
    webhookPath: "/api/whatsapp/webhook",
    requiredMetaSubscription: "messages (objeto Page)",
    messengerConversations,
    lastMessengerInboundAt: lastInboundAt,
    checks: {
      handshakeReady: verifyTokens.length > 0,
      postAuthReady: Boolean(process.env.META_APP_SECRET?.trim()),
      sendReady: Boolean(integration),
      pageFilterActive: configuredPageIds.length > 0,
    },
    hints: [
      !verifyTokens.length
        ? "Falta MESSENGER_VERIFY_TOKEN (o WHATSAPP_VERIFY_TOKEN) en Vercel."
        : null,
      !process.env.META_APP_SECRET?.trim()
        ? "Falta META_APP_SECRET — Meta recibirá 401 al enviar eventos."
        : null,
      !integration
        ? "Falta Page ID + Page Access Token (Vercel o Admin → Configuración → Messenger)."
        : null,
      configuredPageIds.length > 0
        ? "Solo se aceptan mensajes de las Page IDs configuradas; otras se ignoran."
        : null,
    ].filter(Boolean),
  });
}
