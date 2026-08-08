export const WEB_QR_CONVERSATION_PREFIX = "webqr:" as const;

export function webQrConversationId(customerPhone: string): string {
  const digits = customerPhone.replace(/\D/g, "");
  return `${WEB_QR_CONVERSATION_PREFIX}${digits}`;
}

export function isWebQrConversation(conversationId: string): boolean {
  return conversationId.startsWith(WEB_QR_CONVERSATION_PREFIX);
}

export function parseWebQrCustomerPhone(conversationId: string): string | null {
  if (!isWebQrConversation(conversationId)) return null;
  return conversationId.slice(WEB_QR_CONVERSATION_PREFIX.length);
}
