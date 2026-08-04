"use client";

import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";

export function ConversationItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors duration-200",
        active
          ? "border-brand/20 bg-brand-soft"
          : "border-transparent hover:bg-canvas",
      )}
    >
      <div className="relative shrink-0">
        <InitialsAvatar initials={getInitials(conversation.customerName)} />
        {conversation.online && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-success" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[14px] font-semibold text-ink">
            {conversation.customerName}
          </p>
          <span className="shrink-0 text-[11px] text-muted">
            {conversation.lastMessageTime}
          </span>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-[13px] text-muted">{conversation.lastMessage}</p>
          {conversation.unread > 0 && (
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
              {conversation.unread}
            </span>
          )}
        </div>
        <span
          className={cn(
            "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            conversation.online
              ? "bg-success-soft text-success-ink"
              : conversation.unread > 0
                ? "bg-brand-soft text-brand"
                : "bg-canvas text-muted",
          )}
        >
          {conversation.online ? "En línea" : conversation.unread > 0 ? "No leído" : "Visto"}
        </span>
      </div>
    </button>
  );
}
