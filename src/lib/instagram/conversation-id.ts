export const INSTAGRAM_CONVERSATION_PREFIX = "instagram:" as const;

export function instagramConversationId(igsid: string): string {
  return `${INSTAGRAM_CONVERSATION_PREFIX}${igsid}`;
}

export function isInstagramConversation(conversationId: string): boolean {
  return conversationId.startsWith(INSTAGRAM_CONVERSATION_PREFIX);
}

export function parseInstagramIgsid(conversationId: string): string | null {
  if (!isInstagramConversation(conversationId)) return null;
  return conversationId.slice(INSTAGRAM_CONVERSATION_PREFIX.length);
}
