import "server-only";
import { bridgeSendText } from "@/server/web-qr/bridge-client";
import { webQrRepository } from "@/repositories/web-qr.repository";
import { SLA_ADMIN_ALERT_PHONES } from "@/types/response-sla";

/**
 * RESP-3 Escenario C — envío directo a números fijos de admin, sin pasar
 * por el flujo normal de conversación (no crea/actualiza lead_conversations
 * ni lead_messages, no es un chat de cliente).
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
