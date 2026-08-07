import "server-only";
import { messengerConversationId } from "@/lib/messenger/conversation-id";
import { leadsService } from "@/services/leads.service";
import { fetchMessengerProfile } from "@/server/messenger/send";

type MessengerEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

export async function persistMessengerInbound(event: MessengerEvent, pageId: string): Promise<void> {
  const psid = event.sender?.id;
  const mid = event.message?.mid;
  const text = event.message?.text?.trim();

  if (!psid || !mid || !text) return;
  if (event.message?.is_echo) return;

  const conversationId = messengerConversationId(psid);
  const customerName = (await fetchMessengerProfile(psid)) || `Messenger ${psid.slice(-6)}`;

  await leadsService.receiveMessage({
    waMessageId: `messenger-${mid}`,
    conversationId,
    phone: psid,
    customerName,
    body: text,
    direction: "in",
    createdAt: event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    dumoPhoneId: pageId,
    messageType: "text",
  });
}
