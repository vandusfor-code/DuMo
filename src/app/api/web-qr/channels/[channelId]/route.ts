import { NextResponse } from "next/server";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeDisconnectSession } from "@/server/web-qr/bridge-client";
import { webQrConfigured } from "@/server/web-qr/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ channelId: string }> };

/** Elimina una línea QR y purga su sesión en el bridge. */
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
      console.warn("[DELETE /api/web-qr/channels/...]", error);
    }
  }

  await webQrRepository.deleteWebQrChannel(channelId);

  return NextResponse.json({ ok: true, channelId });
}
