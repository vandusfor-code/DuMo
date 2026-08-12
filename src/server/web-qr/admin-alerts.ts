import "server-only";
import { bridgeSendText } from "@/server/web-qr/bridge-client";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { SLA_ADMIN_ALERT_PHONES } from "@/types/response-sla";

/**
 * Envío directo a números fijos de admin (Monica/Duvan), sin pasar por el
 * flujo normal de conversación (no crea/actualiza lead_conversations ni
 * lead_messages, no es un chat de cliente). Usado por las alertas de SLA
 * (RESP-3 Escenario C) y por los cambios de estado de presencia.
 */
export async function sendSlaAdminAlert(text: string): Promise<void> {
  const channel = await webQrRepository.findWebQrChannelForRouting(null);
  if (!channel) {
    console.error("[sendSlaAdminAlert] no hay canal WEB_QR conectado para enviar la alerta.");
    return;
  }
  for (const to of SLA_ADMIN_ALERT_PHONES) {
    try {
      await bridgeSendText({ channelId: channel.id, to, text });
    } catch (err) {
      console.error("[sendSlaAdminAlert] fallo enviando a", to, err);
    }
  }
}
