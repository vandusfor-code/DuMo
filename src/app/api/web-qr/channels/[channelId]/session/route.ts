import { NextResponse } from "next/server";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import {
  bridgeCreateSession,
  bridgeGetSessionStatusOrNull,
  bridgeDisconnectSession,
} from "@/server/web-qr/bridge-client";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { webQrBridgeUrl, webQrConfigured, webQrWebhookSecret } from "@/server/web-qr/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteCtx = { params: Promise<{ channelId: string }> };

async function ensureBridgeSession(input: {
  channelId: string;
  label: string;
  webhookUrl: string;
  webhookSecret: string;
}) {
  const bridgeSessionId = `bridge-${input.channelId}`;

  await bridgeCreateSession({
    channelId: input.channelId,
    label: input.label,
    webhookUrl: input.webhookUrl,
    webhookSecret: input.webhookSecret,
  });
  await webQrRepository.updateSessionBridge({ channelId: input.channelId, bridgeSessionId });

  let status = await bridgeGetSessionStatusOrNull(bridgeSessionId);
  if (status?.status === "CONNECTED" || status?.qrDataUrl) {
    return { bridgeSessionId, status };
  }

  await webQrRepository.updateChannelStatus(input.channelId, "INITIALIZING");

  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    status = await bridgeGetSessionStatusOrNull(bridgeSessionId);
    if (status?.qrDataUrl || status?.status === "CONNECTED") {
      return { bridgeSessionId, status };
    }
  }

  return {
    bridgeSessionId,
    status: status ?? { sessionId: bridgeSessionId, status: "INITIALIZING" },
  };
}

/** Inicia o consulta la sesión QR de un canal WEB_QR. */
export async function POST(_request: Request, { params }: RouteCtx) {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  if (!webQrConfigured()) {
    return NextResponse.json({ error: "Bridge QR no configurado." }, { status: 503 });
  }

  const { channelId } = await params;
  const channel = await webQrRepository.getChannel(channelId);
  if (!channel || channel.channelType !== "WEB_QR") {
    return NextResponse.json({ error: "Canal no encontrado." }, { status: 404 });
  }

  const webhookSecret = webQrWebhookSecret()!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;

  try {
    const { bridgeSessionId, status } = await ensureBridgeSession({
      channelId,
      label: channel.label,
      webhookUrl,
      webhookSecret,
    });

    if (status.status === "CONNECTED" && status.phoneNumber) {
      const phone = normalizeWhatsAppPhoneDigits(status.phoneNumber);
      await webQrRepository.updateChannelStatus(channelId, "CONNECTED", phone);
    }

    return NextResponse.json({
      channelId,
      bridgeSessionId,
      ...status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[POST /api/web-qr/.../session]", message);
    return NextResponse.json(
      {
        error: message,
        hint:
          message.includes("401") || message.includes("Unauthorized")
            ? "WEB_QR_BRIDGE_SECRET en Vercel debe ser idéntico a BRIDGE_SECRET en Railway."
            : "Revisa WEB_QR_BRIDGE_URL=https://dumo-production.up.railway.app y logs de Railway.",
      },
      { status: 502 },
    );
  }
}

export async function GET(_request: Request, { params }: RouteCtx) {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const { channelId } = await params;
  const channel = await webQrRepository.getChannel(channelId);
  if (!channel || channel.channelType !== "WEB_QR") {
    return NextResponse.json({ error: "Canal no encontrado." }, { status: 404 });
  }

  const dbSession = await webQrRepository.getSessionByChannel(channelId);
  const bridgeSessionId = dbSession?.bridgeSessionId ?? `bridge-${channelId}`;

  if (!webQrConfigured()) {
    return NextResponse.json({
      channelId,
      status: channel.status,
      qrDataUrl: null,
    });
  }

  let status = await bridgeGetSessionStatusOrNull(bridgeSessionId);
  if (!status && !dbSession) {
    // Canal nunca conectado (sin fila en web_qr_sessions todavía) — no
    // arrancar una sesión Baileys automáticamente desde un poll de solo
    // lectura (esta ruta se consulta cada 5s mientras la pantalla admin está
    // abierta). El primer intento de conexión debe venir de una acción
    // explícita (botón "Generar código QR"), nunca de solo tener la pestaña
    // abierta o refrescarla.
    return NextResponse.json({
      channelId,
      status: "DISCONNECTED",
      qrDataUrl: null,
    });
  }
  if (!status) {
    const webhookSecret = webQrWebhookSecret()!;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
    const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;
    try {
      const restored = await ensureBridgeSession({
        channelId,
        label: channel.label,
        webhookUrl,
        webhookSecret,
      });
      status = restored.status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await webQrRepository.updateChannelStatus(channelId, "DISCONNECTED");
      return NextResponse.json({
        channelId,
        status: "DISCONNECTED",
        qrDataUrl: null,
        error: message,
      });
    }
  }
  if (!status) {
    await webQrRepository.updateChannelStatus(channelId, "DISCONNECTED");
    return NextResponse.json({
      channelId,
      status: "DISCONNECTED",
      qrDataUrl: null,
      error: "Sesión perdida en el bridge. Pulsa Generar código QR de nuevo.",
    });
  }
  if (status.status === "CONNECTED" && status.phoneNumber) {
    const phone = normalizeWhatsAppPhoneDigits(status.phoneNumber);
    await webQrRepository.updateChannelStatus(channelId, "CONNECTED", phone);
    await webQrRepository.updateSessionBridge({ channelId, bridgeSessionId });
  } else if (status.status === "DISCONNECTED") {
    await webQrRepository.updateChannelStatus(channelId, "DISCONNECTED");
  } else if (status.status === "QR_PENDING" || status.status === "INITIALIZING") {
    await webQrRepository.updateChannelStatus(channelId, "INITIALIZING");
  }

  return NextResponse.json({
    channelId,
    bridgeSessionId,
    bridgeUrl: webQrBridgeUrl(),
    ...status,
  });
}

export async function DELETE(_request: Request, { params }: RouteCtx) {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const { channelId } = await params;
  const channel = await webQrRepository.getChannel(channelId);
  if (!channel || channel.channelType !== "WEB_QR") {
    return NextResponse.json({ error: "Canal no encontrado." }, { status: 404 });
  }

  const dbSession = await webQrRepository.getSessionByChannel(channelId);
  const bridgeSessionId = dbSession?.bridgeSessionId ?? `bridge-${channelId}`;

  if (webQrConfigured()) {
    try {
      await bridgeDisconnectSession(bridgeSessionId);
    } catch (error) {
      console.warn("[DELETE /api/web-qr/.../session] bridge:", error);
    }
  }

  await webQrRepository.clearWebQrSession(channelId);

  return NextResponse.json({ ok: true, channelId });
}
