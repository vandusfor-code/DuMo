export const MESSENGER_CONVERSATION_PREFIX = "messenger:" as const;

export function messengerConversationId(psid: string): string {
  return `${MESSENGER_CONVERSATION_PREFIX}${psid}`;
}

export function isMessengerConversation(conversationId: string): boolean {
  return conversationId.startsWith(MESSENGER_CONVERSATION_PREFIX);
}

export function parseMessengerPsid(conversationId: string): string | null {
  if (!isMessengerConversation(conversationId)) return null;
  return conversationId.slice(MESSENGER_CONVERSATION_PREFIX.length);
}
