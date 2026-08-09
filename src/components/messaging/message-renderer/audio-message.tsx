"use client";

import type { ChatMessage } from "@/types/conversation";

export function AudioMessage({ message }: { message: ChatMessage }) {
  if (!message.mediaUrl) {
    return <p className="text-muted italic">Audio no disponible</p>;
  }

  return (
    <div className="min-w-[220px] max-w-[320px]">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        controls
        preload="metadata"
        src={message.mediaUrl}
        className="h-10 w-full max-w-full"
      />
      {message.text && message.text !== "🎤 Nota de voz" && message.text !== "🔊 Audio" ? (
        <p className="mt-1.5 text-[13px] text-muted">{message.text}</p>
      ) : null}
    </div>
  );
}
