import type { ConversationChannel } from "@/types/conversation";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";
import { isWebQrConversation } from "@/lib/web-qr/conversation-id";

export function resolveConversationChannel(conversationId: string): ConversationChannel {
  if (isMessengerConversation(conversationId)) return "messenger";
  if (isWebQrConversation(conversationId)) return "web_qr";
  return "whatsapp";
}
