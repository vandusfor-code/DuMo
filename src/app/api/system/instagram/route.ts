import { NextResponse } from "next/server";
import {
  allowedInstagramUserIds,
  getInstagramIntegrationConfig,
  instagramWebhookVerifyTokens,
} from "@/server/instagram/config";
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
 * Diagnóstico de Instagram. No expone tokens — solo si están configurados
 * y cuántas conversaciones instagram hay en BD.
 */
export async function GET() {
  const integration = await getInstagramIntegrationConfig();
  const envUserIds = allowedInstagramUserIds();
  const verifyTokens = instagramWebhookVerifyTokens();

  let instagramConversations = 0;
  let lastInboundAt: string | null = null;

  if (hasDatabase() && getSql()) {
    await ensureSchema();
    const rows = (await getSql()!`
      SELECT COUNT(*)::int AS count
      FROM lead_conversations
      WHERE id LIKE 'instagram:%'
    `) as unknown as { count: number }[];
    instagramConversations = rows[0]?.count ?? 0;

    const lastRows = (await getSql()!`
      SELECT lm.created_at
      FROM lead_messages lm
      JOIN lead_conversations lc ON lc.id = lm.conversation_id
      WHERE lc.id LIKE 'instagram:%' AND lm.direction = 'in'
      ORDER BY lm.created_at DESC
      LIMIT 1
    `) as unknown as { created_at: string }[];
    lastInboundAt = lastRows[0]?.created_at ?? null;
  }

  const configuredUserIds = [
    ...new Set([...envUserIds, integration?.igUserId].filter(Boolean) as string[]),
  ];

  return NextResponse.json({
    ok: Boolean(integration),
    verifyTokenConfigured: verifyTokens.length > 0,
    verifyTokenCount: verifyTokens.length,
    appSecretConfigured: Boolean(
      process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim(),
    ),
    accessTokenConfigured: Boolean(integration),
    igUserIdConfigured: configuredUserIds.length > 0,
    configuredUserIds: configuredUserIds.map(mask),
    username: integration?.username ?? null,
    webhookPath: "/api/instagram/webhook",
    requiredMetaSubscription: "messages (objeto Instagram)",
    instagramConversations,
    lastInstagramInboundAt: lastInboundAt,
    checks: {
      handshakeReady: verifyTokens.length > 0,
      postAuthReady: Boolean(
        process.env.INSTAGRAM_APP_SECRET?.trim() || process.env.META_APP_SECRET?.trim(),
      ),
      sendReady: Boolean(integration),
      userFilterActive: configuredUserIds.length > 0,
    },
    hints: [
      !verifyTokens.length
        ? "Falta INSTAGRAM_VERIFY_TOKEN (o MESSENGER_VERIFY_TOKEN/WHATSAPP_VERIFY_TOKEN) en Vercel."
        : null,
      !process.env.INSTAGRAM_APP_SECRET?.trim() && !process.env.META_APP_SECRET?.trim()
        ? "Falta INSTAGRAM_APP_SECRET (o META_APP_SECRET) — Meta recibirá 401 al enviar eventos."
        : null,
      !integration
        ? "Falta IG User ID + Access Token (Vercel o Admin → Configuración → Instagram)."
        : null,
      configuredUserIds.length > 0
        ? "Solo se aceptan mensajes de las cuentas de Instagram configuradas; otras se ignoran."
        : null,
    ].filter(Boolean),
  });
}
