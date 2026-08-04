"use client";

import { MoreVertical, Tag, Users } from "lucide-react";
import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import type { Conversation } from "@/types/conversation";

export function ChatHeader({ conversation }: { conversation: Conversation }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
      <div className="flex items-center gap-3">
        <InitialsAvatar initials={getInitials(conversation.customerName)} />
        <div className="leading-tight">
          <p className="text-[15px] font-semibold text-ink">
            {conversation.customerName}
          </p>
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            {conversation.online && <span className="size-2 rounded-full bg-success" />}
            {conversation.online ? "En línea" : "Desconectado"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {[Tag, Users, MoreVertical].map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
          >
            <Icon className="size-[18px]" />
          </button>
        ))}
      </div>
    </div>
  );
}
