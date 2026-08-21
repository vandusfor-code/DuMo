import type { ConversationChannel } from "@/types/conversation";
import { isMessengerConversation } from "@/lib/messenger/conversation-id";
import { isWebQrConversation } from "@/lib/web-qr/conversation-id";
import { isInstagramConversation } from "@/lib/instagram/conversation-id";

export function resolveConversationChannel(conversationId: string): ConversationChannel {
  if (isMessengerConversation(conversationId)) return "messenger";
  if (isInstagramConversation(conversationId)) return "instagram";
  if (isWebQrConversation(conversationId)) return "web_qr";
  return "whatsapp";
}
