"use client";

import { useState } from "react";
import { AlertTriangle, Mic, Paperclip, RefreshCw, Send, Smile } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatHeader } from "@/components/leads/chat-header";
import { ChatBubble } from "@/components/leads/chat-bubble";
import type { AdminConversation } from "@/types/admin-lead";
import type { ChatMessage, Conversation } from "@/types/conversation";

export function AdminChatPanel({
  conversation,
  messages,
  isLoading,
  isError = false,
  errorMessage,
  onRetry,
  onSend,
  isSending,
  sendError,
}: {
  conversation: AdminConversation;
  messages: ChatMessage[];
  isLoading: boolean;
  /** Falló la carga: se avisa en vez de dejar el chat en gris para siempre. */
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onSend: (text: string) => Promise<void>;
  isSending?: boolean;
  sendError?: string | null;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const handleSend = async () => {
    const text = value.trim();
    if (!text || isSending) return;
    setError(null);
    try {
      await onSend(text);
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el mensaje.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ChatHeader conversation={headerConv} />
      </div>

      <div className="chat-bg min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="flex justify-center">
          <span className="rounded-full border border-line bg-card px-3 py-1 text-[11px] font-medium text-muted">
            Hoy
          </span>
        </div>

        {isError && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-danger/20 bg-danger-soft px-3 py-1.5 text-[12px] font-medium text-danger-ink">
              <AlertTriangle className="size-3.5" />
              {errorMessage ?? "No se pudieron cargar los mensajes."}
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

        {isLoading && messages.length === 0 && !isError ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-56 rounded-2xl" />
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        {(error || sendError) && (
          <p className="mb-2 rounded-lg bg-danger-soft px-3 py-2 text-[12px] font-medium text-danger-ink">
            {error ?? sendError}
          </p>
        )}
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Emoji" className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand">
            <Smile className="size-5" />
          </button>
          <button type="button" aria-label="Adjuntar" className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand">
            <Paperclip className="size-5" />
          </button>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void handleSend()}
            placeholder="Escribe un mensaje..."
            disabled={isSending}
            className="min-h-10 flex-1 rounded-2xl border border-line bg-canvas px-4 text-[14px] outline-none ring-0 placeholder:text-muted disabled:opacity-60"
          />
          {value.trim() ? (
            <button
              type="button"
              aria-label="Enviar"
              disabled={isSending}
              onClick={() => void handleSend()}
              className="grid size-10 place-items-center rounded-full bg-brand text-white disabled:opacity-60"
            >
              <Send className="size-[18px]" />
            </button>
          ) : (
            <button type="button" aria-label="Micrófono" className="grid size-10 place-items-center rounded-full text-muted">
              <Mic className="size-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
