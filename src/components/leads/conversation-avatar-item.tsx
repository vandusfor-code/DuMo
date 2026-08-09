"use client";

import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";

/** Vista compacta: avatar + badge + estado en línea (columna colapsada). */
export function ConversationAvatarItem({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  const unread = conversation.unread;

  return (
    <button
      type="button"
      onClick={onClick}
      title={conversation.customerName}
      aria-label={`${conversation.customerName}${unread > 0 ? `, ${unread} sin leer` : ""}`}
      aria-current={active ? "true" : undefined}
      className="relative mx-auto flex w-full justify-center py-1 transition-all duration-200"
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-[14px] transition-all duration-200",
          active ? "bg-brand-soft px-2.5 py-2" : "px-0 py-0",
        )}
      >
        <div className="relative size-11 shrink-0">
          <InitialsAvatar
            initials={getInitials(conversation.customerName)}
            className={cn(
              "size-11 text-[13px]",
              active ? "bg-white text-brand" : "bg-brand-soft text-brand",
            )}
          />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 z-10 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
              {unread > 99 ? "99" : unread}
            </span>
          ) : null}
          {conversation.online ? (
            <span className="absolute -bottom-0.5 -right-0.5 z-10 size-2.5 rounded-full border-2 border-white bg-success" />
          ) : null}
        </div>
      </div>
    </button>
  );
}
