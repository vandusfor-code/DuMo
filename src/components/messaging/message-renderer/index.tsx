"use client";

import type { ChatMessage } from "@/types/conversation";
import { ImageMessage } from "./image-message";
import { MessageShell } from "./message-shell";
import { TextMessage } from "./text-message";

function isImageMessage(message: ChatMessage): boolean {
  return message.messageType === "image" && Boolean(message.mediaUrl);
}

/** Renderer único del chat: solo texto e imágenes. */
export function MessageRenderer({ message }: { message: ChatMessage }) {
  if (isImageMessage(message)) {
    return (
      <MessageShell message={message} isMedia>
        <ImageMessage message={message} />
      </MessageShell>
    );
  }

  return (
    <MessageShell message={message}>
      <TextMessage message={message} />
    </MessageShell>
  );
}
