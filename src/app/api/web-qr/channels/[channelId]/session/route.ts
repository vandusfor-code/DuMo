import { NextResponse } from "next/server";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import {
  bridgeCreateSession,
  bridgeGetSessionStatusOrNull,
  bridgeDisconnectSession,
} from "@/server/web-qr/bridge-client";
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
  const existing = await webQrRepository.getSessionByChannel(input.channelId);
  let bridgeSessionId = existing?.bridgeSessionId ?? null;

  if (bridgeSessionId) {
    const live = await bridgeGetSessionStatusOrNull(bridgeSessionId);
    if (live) return { bridgeSessionId, status: live };
    // Bridge reinició — recrear sesión
    bridgeSessionId = null;
    await webQrRepository.updateSessionBridge({
      channelId: input.channelId,
      bridgeSessionId: "",
      sessionData: {},
    });
  }

  const created = await bridgeCreateSession({
    channelId: input.channelId,
    label: input.label,
    webhookUrl: input.webhookUrl,
    webhookSecret: input.webhookSecret,
  });
  bridgeSessionId = created.sessionId;
  await webQrRepository.updateSessionBridge({
    channelId: input.channelId,
    bridgeSessionId,
  });
  await webQrRepository.updateChannelStatus(input.channelId, "INITIALIZING");

  // Baileys tarda unos segundos en emitir el QR
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await bridgeGetSessionStatusOrNull(bridgeSessionId);
    if (status?.qrDataUrl || status?.status === "CONNECTED") {
      return { bridgeSessionId, status };
    }
  }

  const status = await bridgeGetSessionStatusOrNull(bridgeSessionId);
  return { bridgeSessionId, status: status ?? { sessionId: bridgeSessionId, status: "INITIALIZING" } };
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
      await webQrRepository.updateChannelStatus(channelId, "CONNECTED", status.phoneNumber);
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
  if (!dbSession?.bridgeSessionId) {
    return NextResponse.json({
      channelId,
      status: channel.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED",
      qrDataUrl: null,
    });
  }

  const status = await bridgeGetSessionStatusOrNull(dbSession.bridgeSessionId);
  if (!status) {
    return NextResponse.json({
      channelId,
      status: "DISCONNECTED",
      qrDataUrl: null,
      error: "Sesión perdida en el bridge (reinicio). Pulsa Generar código QR de nuevo.",
    });
  }
  if (status.status === "CONNECTED" && status.phoneNumber) {
    await webQrRepository.updateChannelStatus(channelId, "CONNECTED", status.phoneNumber);
  }

  return NextResponse.json({
    channelId,
    bridgeSessionId: dbSession.bridgeSessionId,
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
  const dbSession = await webQrRepository.getSessionByChannel(channelId);
  if (dbSession?.bridgeSessionId) {
    try {
      await bridgeDisconnectSession(dbSession.bridgeSessionId);
    } catch {
      /* bridge caído — igual marcamos desconectado localmente */
    }
  }

  await webQrRepository.updateChannelStatus(channelId, "DISCONNECTED");
  await webQrRepository.saveSessionData(channelId, {});

  return NextResponse.json({ ok: true });
}
