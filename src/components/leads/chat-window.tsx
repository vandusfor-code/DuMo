"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatThemeProvider } from "@/components/leads/premium/chat-theme";
import { ChatHeader } from "./chat-header";
import { ChatBubble } from "./chat-bubble";
import { ChatInput } from "./chat-input";
import type { ChatMessage, Conversation } from "@/types/conversation";
import type { ChatUiTheme } from "@/components/leads/premium/chat-theme";
import { cn } from "@/lib/utils";

export function ChatWindow({
  conversation,
  messages,
  isLoading,
  isError = false,
  errorMessage,
  onRetry,
  variant = "advisor",
  showEncryptionBanner = false,
  uiTheme = "default",
}: {
  conversation: Conversation;
  messages: ChatMessage[];
  isLoading: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  variant?: "advisor" | "admin";
  showEncryptionBanner?: boolean;
  uiTheme?: ChatUiTheme;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const premium = uiTheme === "premium";

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      endRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length, conversation.id]);

  return (
    <ChatThemeProvider theme={uiTheme}>
      <div className="flex h-full min-h-0 flex-col">
        <ChatHeader conversation={conversation} />

        <div
          className={cn(
            "chat-bg min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
            premium ? "space-y-2 px-5 py-4" : "space-y-3 px-5 py-4",
          )}
        >
          {showEncryptionBanner ? (
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-medium text-brand">
                Los mensajes están cifrados de extremo a extremo.
              </span>
            </div>
          ) : null}

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

          {messages.length > 0 && (
            <div className="flex justify-center">
              <span className="rounded-full border border-line bg-card px-3 py-1 text-[12px] font-medium text-muted">
                Hoy
              </span>
            </div>
          )}

          {isLoading && messages.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-48 rounded-[16px]" />
              <Skeleton className="ml-auto h-10 w-56 rounded-[16px]" />
              <Skeleton className="h-10 w-40 rounded-[16px]" />
            </div>
          ) : (
            messages.map((m) => <ChatBubble key={m.id} message={m} />)
          )}
          <div ref={endRef} />
        </div>

        <ChatInput
          conversationId={conversation.id}
          to={conversation.phone}
          customerName={conversation.customerName}
          variant={variant}
          uiTheme={uiTheme}
        />
      </div>
    </ChatThemeProvider>
  );
}
