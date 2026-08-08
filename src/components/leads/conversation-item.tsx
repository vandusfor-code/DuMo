"use client";

import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";

/** ConversationCard — tarjeta compacta de conversación. */
export function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const statusLabel = conversation.online
    ? "En línea"
    : conversation.unread > 0
      ? "No leído"
      : "Visto";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left",
        "transition-colors duration-200",
        active
          ? "border-border-strong bg-active-surface"
          : "border-transparent bg-card hover:bg-hover",
      )}
    >
      <div className="relative shrink-0">
        <InitialsAvatar
          initials={getInitials(conversation.customerName)}
          className="size-10 text-[13px]"
        />
        {conversation.online && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[14px] font-semibold leading-tight text-ink">
            {conversation.customerName}
            {conversation.channel === "messenger" ? (
              <span className="ml-1.5 text-[10px] font-medium text-brand">Messenger</span>
            ) : conversation.channel === "web_qr" ? (
              <span className="ml-1.5 text-[10px] font-medium text-warning-ink">Web</span>
            ) : null}
          </p>
          <span className="shrink-0 text-[11px] text-muted">{conversation.lastMessageTime}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[13px] leading-snug text-muted">
            {conversation.lastMessage}
          </p>
          {conversation.unread > 0 ? (
            <span className="grid size-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
              {conversation.unread}
            </span>
          ) : (
            <span className="shrink-0 text-[11px] text-placeholder">{statusLabel}</span>
          )}
        </div>
      </div>
    </button>
  );
}
