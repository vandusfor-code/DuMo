"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatHeader } from "./chat-header";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import type { ChatMessage, Conversation } from "@/types/conversation";

export function ChatWindow({
  conversation,
  messages,
  isLoading,
  isError = false,
  onRetry,
}: {
  conversation: Conversation;
  messages: ChatMessage[];
  isLoading: boolean;
  /** Falló la carga: se avisa en vez de mostrar un chat vacío engañoso. */
  isError?: boolean;
  onRetry?: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // Baja al último mensaje cuando llegan nuevos (o al abrir la conversación).
  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length, conversation.id]);

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

        {isError && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger-soft px-3 py-1.5 text-[12px] font-medium text-danger-ink">
              <AlertTriangle className="size-3.5" />
              No se pudieron cargar los mensajes.
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <RefreshCw className="size-3" />
                  Reintentar
                </button>
              )}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className="flex justify-center">
            <span className="rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium text-muted">
              Hoy
            </span>
          </div>
        )}

        {isLoading && messages.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-56 rounded-2xl" />
            <Skeleton className="h-10 w-40 rounded-2xl" />
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
        <div ref={endRef} />
      </div>

      <ChatInput conversationId={conversation.id} to={conversation.phone} />
    </div>
  );
}
