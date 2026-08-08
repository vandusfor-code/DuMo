import "server-only";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeCreateSession, bridgeGetSessionStatusOrNull } from "@/server/web-qr/bridge-client";
import { webQrWebhookSecret } from "@/server/web-qr/config";

function bridgeSessionId(channelId: string): string {
  return `bridge-${channelId}`;
}

/** Reconecta Baileys tras reinicio del bridge antes de enviar mensajes. */
export async function ensureWebQrBridgeReady(channelId: string): Promise<void> {
  const channel = await webQrRepository.findWebQrChannelForRouting(channelId);
  if (!channel) {
    throw new Error(
      "No hay línea WhatsApp Web configurada. Ve a Admin → WhatsApp Web (QR), agrega una línea y escanea el QR.",
    );
  }

  const resolvedId = channel.id;
  const sessionId = bridgeSessionId(resolvedId);
  const live = await bridgeGetSessionStatusOrNull(sessionId);
  if (live?.status === "CONNECTED") return;

  const webhookSecret = webQrWebhookSecret();
  if (!webhookSecret) {
    throw new Error("WEB_QR_WEBHOOK_SECRET no configurado en Vercel.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;

  await bridgeCreateSession({
    channelId: resolvedId,
    label: channel.label,
    webhookUrl,
    webhookSecret,
  });

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const status = await bridgeGetSessionStatusOrNull(sessionId);
    if (status?.status === "CONNECTED") {
      await webQrRepository.updateChannelStatus(resolvedId, "CONNECTED", status.phoneNumber);
      await webQrRepository.updateSessionBridge({ channelId: resolvedId, bridgeSessionId: sessionId });
      return;
    }
    if (status?.status === "QR_PENDING") {
      throw new Error(
        "WhatsApp Web desconectado. Ve a Admin → WhatsApp Web (QR) y escanea el código de nuevo.",
      );
    }
  }

  throw new Error(
    "WhatsApp Web aún reconectando. Espera unos segundos e intenta de nuevo.",
  );
}
