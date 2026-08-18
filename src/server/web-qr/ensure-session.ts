import "server-only";
import { normalizeWhatsAppPhoneDigits } from "@/lib/whatsapp/phone";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { bridgeCreateSession, bridgeGetSessionStatusOrNull } from "@/server/web-qr/bridge-client";
import { webQrWebhookSecret } from "@/server/web-qr/config";
import { verifyWebQrWebhookReachable } from "@/server/web-qr/verify-webhook";

function bridgeSessionId(channelId: string): string {
  return `bridge-${channelId}`;
}

function webQrWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://du-mo.vercel.app";
  return `${appUrl.replace(/\/$/, "")}/api/web-qr/webhook`;
}

/** Registra la sesión en el bridge (sin esperar CONNECTED). Tras reinicios de Railway. */
export async function registerWebQrBridgeSession(channelId: string): Promise<void> {
  const channel = await webQrRepository.getChannel(channelId);
  if (!channel || channel.channelType !== "WEB_QR") return;

  const webhookSecret = webQrWebhookSecret();
  if (!webhookSecret) return;

  await bridgeCreateSession({
    channelId,
    label: channel.label,
    webhookUrl: webQrWebhookUrl(),
    webhookSecret: webhookSecret.trim(),
  });
  await webQrRepository.updateSessionBridge({
    channelId,
    bridgeSessionId: bridgeSessionId(channelId),
  });
}

/** Re-registra todas las líneas QR de la BD en el bridge. */
export async function reconcileWebQrBridgeSessions(): Promise<number> {
  const channels = await webQrRepository.listWebQrChannels();
  let registered = 0;
  for (const ch of channels) {
    try {
      await registerWebQrBridgeSession(ch.id);
      registered++;
    } catch (error) {
      console.warn("[reconcileWebQrBridgeSessions]", ch.id, error);
    }
  }
  return registered;
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

  let live = await bridgeGetSessionStatusOrNull(sessionId);

  // Registrar en el bridge SOLO cuando no hay confirmación fresca de que ya
  // está CONNECTED — llamar esto en cada envío (incluso ya conectado) hacía
  // que el bridge recibiera un POST /sessions constante; si ese POST caía
  // justo en la ventana de un reintento automático tras un corte transitorio
  // (código != loggedOut), el bridge terminaba abriendo un segundo socket
  // Baileys con las mismas credenciales — eso producía el bucle de
  // "connectionReplaced" que tumbó la sesión. El registro sigue existiendo
  // para el caso real que lo necesita: tras un reinicio de Railway, cuando
  // el bridge perdió el registro en memoria y no está conectado.
  if (live?.status !== "CONNECTED") {
    await registerWebQrBridgeSession(resolvedId);
  }

  const webhookCheck = await verifyWebQrWebhookReachable();
  if (!webhookCheck.ok) {
    throw new Error(
      `Webhook QR rechazado (${webhookCheck.status ?? "?"}): ${webhookCheck.error ?? "revisa WEB_QR_WEBHOOK_SECRET en Vercel y DUMO_WEBHOOK_SECRET en Railway"}`,
    );
  }

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
