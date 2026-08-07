"use client";

import { ChatImageBubble } from "@/components/messaging/chat-image-viewer";
import type { ChatMessage } from "@/types/conversation";

export function ImageMessage({ message }: { message: ChatMessage }) {
  if (!message.mediaUrl) {
    return <p className="text-muted italic">Imagen no disponible</p>;
  }

  return (
    <ChatImageBubble
      src={message.mediaUrl}
      caption={message.caption || (message.text !== "Imagen" ? message.text : undefined)}
      out={message.direction === "out"}
    />
  );
}
