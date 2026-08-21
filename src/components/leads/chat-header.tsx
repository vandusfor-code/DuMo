"use client";

import { MoreVertical, Phone, Tag, Video } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChatUiTheme } from "@/components/leads/premium/chat-theme";
import type { Conversation } from "@/types/conversation";

export function ChatHeader({ conversation }: { conversation: Conversation }) {
  const premium = useChatUiTheme() === "premium";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-line px-6",
        premium ? "h-16 px-5" : "px-5 py-3.5",
      )}
    >
      <div className="flex items-center gap-3">
        <InitialsAvatar
          initials={getInitials(conversation.customerName)}
          className={premium ? "size-11 text-[14px]" : undefined}
        />
        <div className="leading-tight">
          <p className="text-[16px] font-semibold text-ink">
            {conversation.customerName}
            {conversation.channel === "messenger" ? (
              <span className="ml-1.5 text-[12px] font-medium text-brand">Messenger</span>
            ) : conversation.channel === "instagram" ? (
              <span className="ml-1.5 text-[12px] font-medium text-brand">Instagram</span>
            ) : conversation.channel === "web_qr" ? (
              <span className="ml-1.5 text-[12px] font-medium text-warning-ink">WhatsApp Web</span>
            ) : null}
          </p>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            {conversation.online && (
              <span className="size-2 rounded-full border-2 border-white bg-online" aria-hidden />
            )}
            {conversation.channel === "messenger"
              ? conversation.online
                ? "Messenger · En línea"
                : "Messenger · Desconectado"
              : conversation.channel === "instagram"
                ? conversation.online
                  ? "Instagram · En línea"
                  : "Instagram · Desconectado"
                : conversation.channel === "web_qr"
                  ? conversation.online
                    ? "WhatsApp Web · En línea"
                    : "WhatsApp Web · Desconectado"
                  : conversation.online
                    ? "En línea"
                    : "Desconectado"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        {[
          { Icon: Tag, label: "Etiqueta" },
          { Icon: Phone, label: "Llamar" },
          { Icon: Video, label: "Videollamada" },
          { Icon: MoreVertical, label: "Más" },
        ].map(({ Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="grid size-9 place-items-center rounded-btn text-muted transition-colors duration-200 hover:bg-hover hover:text-ink"
          >
            <Icon className="size-[18px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
