import "server-only";
import { getSql } from "@/server/db/client";
import { getCampaignRepository } from "@/repositories/campaign.repository";

/**
 * Hook de una sola vía: si la conversación quedó marcada por una campaña
 * (campaign_id, estampado al enviar — ver campaign-worker.ts) y llega un
 * mensaje entrante, se registra como respuesta del contacto de campaña
 * correspondiente. No crea conversaciones ni leads nuevos, no toca la
 * lógica de negocio de receiveMessage — solo lee y anota.
 */
export async function maybeMarkCampaignResponse(conversationId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;

  const rows = await sql<{ campaign_id: string | null }[]>`
    SELECT campaign_id FROM lead_conversations WHERE id = ${conversationId} LIMIT 1
  `;
  const campaignId = rows[0]?.campaign_id;
  if (!campaignId) return;

  const repo = getCampaignRepository();
  const contact = await repo.findContactByConversationId(campaignId, conversationId);
  if (!contact || contact.responseAt) return;

  await repo.markContactResponse(contact.id);
  await repo.logEvent(campaignId, "CONTACT_RESPONSE_RECEIVED", {}, contact.id);

  const { emitCampaignEvent } = await import("@/server/realtime/emit");
  emitCampaignEvent({ campaignId, eventType: "CONTACT_RESPONSE_RECEIVED" });
}
