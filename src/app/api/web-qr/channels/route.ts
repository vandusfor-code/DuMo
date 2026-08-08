import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireAdministradorSession } from "@/lib/require-administrador";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { webQrConfigured } from "@/server/web-qr/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  const channels = await webQrRepository.listWebQrChannels();
  return NextResponse.json({
    configured: webQrConfigured(),
    channels,
  });
}

export async function POST(request: Request) {
  const session = await requireAdministradorSession();
  if (!session) {
    return NextResponse.json({ error: "Solo administradores." }, { status: 403 });
  }

  if (!webQrConfigured()) {
    return NextResponse.json(
      {
        error:
          "Bridge QR no configurado. Define WEB_QR_BRIDGE_URL, WEB_QR_BRIDGE_SECRET y WEB_QR_WEBHOOK_SECRET.",
      },
      { status: 503 },
    );
  }

  let body: { label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const label = body.label?.trim() || "Línea WhatsApp Web";
  const id = `webqr-${crypto.randomUUID()}`;

  const channel = await webQrRepository.createWebQrChannel({ id, label });
  return NextResponse.json(channel, { status: 201 });
}
