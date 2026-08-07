"use client";

import { ChatWindow } from "@/components/leads/chat-window";
import type { AdminConversation } from "@/types/admin-lead";
import type { ChatMessage, Conversation } from "@/types/conversation";

/** Panel de chat admin — reutiliza ChatWindow + ChatInput (mismo flujo que asesor). */
export function AdminChatPanel({
  conversation,
  messages,
  isLoading,
  isError = false,
  errorMessage,
  onRetry,
}: {
  conversation: AdminConversation;
  messages: ChatMessage[];
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  const headerConv: Conversation = {
    id: conversation.id,
    customerName: conversation.customerName,
    phone: conversation.phone,
    rut: conversation.rut,
    lastMessage: conversation.lastMessage,
    lastMessageTime: conversation.lastMessageTime,
    unread: conversation.unread,
    status: "in_progress",
    online: conversation.online,
  };

  return (
    <ChatWindow
      conversation={headerConv}
      messages={messages}
      isLoading={isLoading}
      isError={isError}
      errorMessage={errorMessage}
      onRetry={onRetry}
      variant="admin"
      showEncryptionBanner={false}
    />
  );
}
