import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeCreateSession, bridgeGetSessionStatus, bridgeDisconnectSession } from "@/server/web-qr/bridge-client";
import { webQrBridgeUrl, webQrConfigured, webQrWebhookSecret } from "@/server/web-qr/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type RouteCtx = { params: Promise<{ channelId: string }> };

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

  const existing = await webQrRepository.getSessionByChannel(channelId);
  const webhookSecret = webQrWebhookSecret()!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;

  let bridgeSessionId = existing?.bridgeSessionId ?? null;

  if (!bridgeSessionId) {
    const created = await bridgeCreateSession({
      channelId,
      label: channel.label,
      webhookUrl,
      webhookSecret,
    });
    bridgeSessionId = created.sessionId;
    await webQrRepository.updateSessionBridge({ channelId, bridgeSessionId });
    await webQrRepository.updateChannelStatus(channelId, "INITIALIZING");
  }

  const status = await bridgeGetSessionStatus(bridgeSessionId);
  if (status.status === "CONNECTED" && status.phoneNumber) {
    await webQrRepository.updateChannelStatus(channelId, "CONNECTED", status.phoneNumber);
  }

  return NextResponse.json({
    channelId,
    bridgeSessionId,
    ...status,
  });
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

  const status = await bridgeGetSessionStatus(dbSession.bridgeSessionId);
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
