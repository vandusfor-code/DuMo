"use client";

import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatHeader } from "./chat-header";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import type { ChatMessage, Conversation } from "@/types/conversation";

export function ChatWindow({
  conversation,
  messages,
  isLoading,
}: {
  conversation: Conversation;
  messages: ChatMessage[];
  isLoading: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ChatHeader conversation={conversation} />
      </div>

      <div className="chat-bg min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-medium text-brand">
            <Lock className="size-3" />
            Los mensajes están cifrados de extremo a extremo.
          </span>
        </div>
        <div className="flex justify-center">
          <span className="rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium text-muted">
            Hoy
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-56 rounded-2xl" />
            <Skeleton className="h-10 w-40 rounded-2xl" />
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
      </div>

      <ChatInput conversationId={conversation.id} to={conversation.phone} />
    </div>
  );
}
