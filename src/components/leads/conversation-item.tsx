"use client";

import { AlertTriangle } from "lucide-react";
import { ChannelAvatar } from "@/components/leads/channel-avatar";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";
import { ConversationTipificationBadge } from "./conversation-tipification-badge";
import { useDisplayTipification } from "@/hooks/use-pending-tipification-label";

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
  const displayTipification = useDisplayTipification(conversation);
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
        conversation.activeSlaWarning
          ? conversation.activeSlaWarning.status === "final_warning_sent"
            ? "border-danger/40 bg-danger-soft"
            : "border-warning/40 bg-warning-soft"
          : active
            ? "border-border-strong bg-active-surface"
            : "border-transparent bg-card hover:bg-hover",
      )}
    >
      <div className="relative shrink-0">
        <ChannelAvatar channel={conversation.channel ?? "whatsapp"} className="size-10" />
        {conversation.online && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-online" />
        )}
        {conversation.activeSlaWarning && (
          <span
            title="Aviso de tiempo de respuesta activo"
            className={cn(
              "absolute -top-1 -right-1 grid size-4 place-items-center rounded-full border-2 border-white",
              conversation.activeSlaWarning.status === "final_warning_sent"
                ? "bg-danger"
                : "bg-warning",
            )}
          >
            <AlertTriangle className="size-2.5 text-white" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold leading-tight text-ink">
              {conversation.customerName}
            </p>
            {displayTipification ? (
              <div className="mt-1">
                <ConversationTipificationBadge tipification={displayTipification} />
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="text-[11px] text-muted">{conversation.lastMessageTime}</span>
            {conversation.unread > 0 ? (
              <span className="grid size-5 min-w-5 place-items-center rounded-full bg-brand text-[10px] font-semibold text-white">
                {conversation.unread}
              </span>
            ) : (
              <span className="text-[11px] text-placeholder">{statusLabel}</span>
            )}
          </div>
        </div>
        <p className="mt-1 truncate text-[13px] leading-snug text-muted">{conversation.lastMessage}</p>
      </div>
    </button>
  );
}
