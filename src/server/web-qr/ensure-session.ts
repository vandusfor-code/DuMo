import "server-only";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeCreateSession, bridgeGetSessionStatusOrNull } from "@/server/web-qr/bridge-client";
import { webQrWebhookSecret } from "@/server/web-qr/config";
import { verifyWebQrWebhookReachable } from "@/server/web-qr/verify-webhook";

function bridgeSessionId(channelId: string): string {
  return `bridge-${channelId}`;
}

/** Reconecta Baileys y sincroniza webhook antes de enviar/recibir. */
export async function ensureWebQrBridgeReady(channelId: string): Promise<void> {
  const channel = await webQrRepository.findWebQrChannelForRouting(channelId);
  if (!channel) {
    throw new Error(
      "No hay línea WhatsApp Web configurada. Ve a Admin → WhatsApp Web (QR), agrega una línea y escanea el QR.",
    );
  }

  const resolvedId = channel.id;
  const sessionId = bridgeSessionId(resolvedId);

  const webhookSecret = webQrWebhookSecret();
  if (!webhookSecret) {
    throw new Error("WEB_QR_WEBHOOK_SECRET no configurado en Vercel.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;

  // Siempre registrar en bridge (actualiza webhook tras reinicios de Railway).
  await bridgeCreateSession({
    channelId: resolvedId,
    label: channel.label,
    webhookUrl,
    webhookSecret: webhookSecret.trim(),
  });

  const webhookCheck = await verifyWebQrWebhookReachable();
  if (!webhookCheck.ok) {
    throw new Error(
      `Webhook QR rechazado (${webhookCheck.status ?? "?"}): ${webhookCheck.error ?? "revisa WEB_QR_WEBHOOK_SECRET en Vercel y DUMO_WEBHOOK_SECRET en Railway"}`,
    );
  }

  let live = await bridgeGetSessionStatusOrNull(sessionId);
  if (live?.status === "CONNECTED") {
    await webQrRepository.updateChannelStatus(
      resolvedId,
      "CONNECTED",
      normalizeWhatsAppPhoneDigits(live.phoneNumber ?? ""),
    );
    await webQrRepository.updateSessionBridge({ channelId: resolvedId, bridgeSessionId: sessionId });
    return;
  }

  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    live = await bridgeGetSessionStatusOrNull(sessionId);
    if (live?.status === "CONNECTED") {
      await webQrRepository.updateChannelStatus(
        resolvedId,
        "CONNECTED",
        normalizeWhatsAppPhoneDigits(live.phoneNumber ?? ""),
      );
      await webQrRepository.updateSessionBridge({ channelId: resolvedId, bridgeSessionId: sessionId });
      return;
    }
    if (live?.status === "QR_PENDING") {
      throw new Error(
        "WhatsApp Web desconectado. Ve a Admin → WhatsApp Web (QR) y escanea el código de nuevo.",
      );
    }
  }

  throw new Error(
    "WhatsApp Web aún reconectando. Espera unos segundos e intenta de nuevo.",
  );
}

/** Igual que ensureWebQrBridgeReady pero sin lanzar — para precalentar al abrir admin. */
export async function warmWebQrBridgeSession(channelId: string): Promise<void> {
  try {
    await ensureWebQrBridgeReady(channelId);
  } catch {
    /* el admin verá el estado real en la UI */
  }
}
