import { NextResponse } from "next/server";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeDisconnectSession } from "@/server/web-qr/bridge-client";
import { webQrConfigured } from "@/server/web-qr/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ channelId: string }> };

/** Cambia el operador (WOM/Claro) asignado a una línea ya conectada. */
export async function PATCH(request: Request, { params }: RouteCtx) {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const { channelId } = await params;
  const channel = await webQrRepository.getChannel(channelId);
  if (!channel) {
    return NextResponse.json({ error: "Canal no encontrado." }, { status: 404 });
  }

  let body: { carrier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.carrier !== "wom" && body.carrier !== "claro") {
    return NextResponse.json({ error: "Operador inválido." }, { status: 422 });
  }

  await webQrRepository.updateChannelCarrier(channelId, body.carrier);
  const updated = await webQrRepository.getChannel(channelId);
  return NextResponse.json(updated);
}

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
