"use client";

import { MessageRenderer } from "@/components/messaging/message-renderer";

/** Burbuja de chat — delega en MessageRenderer centralizado. */
export function ChatBubble({ message }: { message: import("@/types/conversation").ChatMessage }) {
  return <MessageRenderer message={message} />;
}
