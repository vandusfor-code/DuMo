"use client";

import { useState } from "react";
import { Mic, Paperclip, Send, Smile } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatHeader } from "@/components/leads/chat-header";
import { ChatBubble } from "@/components/leads/chat-bubble";
import { Lock } from "lucide-react";
import type { AdminConversation } from "@/types/admin-lead";
import type { ChatMessage, Conversation } from "@/types/conversation";

/** Chat admin — solo interfaz, sin integración WhatsApp. */
export function AdminChatPanel({
  conversation,
  messages,
  isLoading,
}: {
  conversation: AdminConversation;
  messages: ChatMessage[];
  isLoading: boolean;
}) {
  const [value, setValue] = useState("");
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        <ChatHeader conversation={headerConv} />
      </div>

      <div className="wa-chat-bg min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-[11px] font-medium text-warning-ink">
            <Lock className="size-3" />
            Vista administrativa — envío deshabilitado
          </span>
        </div>
        <div className="flex justify-center">
          <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium text-muted shadow-sm">
            Hoy
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-48 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-56 rounded-2xl" />
          </div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="shrink-0 border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
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
            placeholder="Escribe un mensaje..."
            className="min-h-10 flex-1 rounded-2xl border-0 bg-white px-4 text-[14px] outline-none ring-0 placeholder:text-muted"
          />
          {value.trim() ? (
            <button type="button" aria-label="Enviar" className="grid size-10 place-items-center rounded-full bg-brand text-white">
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
