"use client";

import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";

/** Vista compacta: solo avatar + badge de no leídos. */
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
      className={cn(
        "relative mx-auto grid size-11 place-items-center rounded-full transition-all duration-200",
        active && "ring-2 ring-brand ring-offset-2 ring-offset-card",
      )}
    >
      <InitialsAvatar
        initials={getInitials(conversation.customerName)}
        className="size-11 text-[13px]"
      />
      {conversation.online && !unread ? (
        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-success" />
      ) : null}
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-brand px-1 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
          {unread > 99 ? "99" : unread}
        </span>
      ) : null}
    </button>
  );
}
