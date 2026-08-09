"use client";

import type { ChatMessage } from "@/types/conversation";
import { AudioMessage } from "./audio-message";
import { ImageMessage } from "./image-message";
import { MessageShell } from "./message-shell";
import { TextMessage } from "./text-message";

function isImageMessage(message: ChatMessage): boolean {
  return message.messageType === "image" && Boolean(message.mediaUrl);
}

function isAudioMessage(message: ChatMessage): boolean {
  return message.messageType === "audio" && Boolean(message.mediaUrl);
}

/** Renderer único del chat: texto, imágenes y audios. */
export function MessageRenderer({ message }: { message: ChatMessage }) {
  if (isImageMessage(message)) {
    return (
      <MessageShell message={message} isMedia>
        <ImageMessage message={message} />
      </MessageShell>
    );
  }

  if (isAudioMessage(message)) {
    return (
      <MessageShell message={message} isMedia>
        <AudioMessage message={message} />
      </MessageShell>
    );
  }

  return (
    <MessageShell message={message}>
      <TextMessage message={message} />
    </MessageShell>
  );
}
