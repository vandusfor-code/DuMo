"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InitialsAvatar } from "@/components/ui/avatar";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AdminAdvisor, AdminConversation } from "@/types/admin-lead";
import { AdminLeadStatusBadge } from "./admin-conversation-filters";

export function AdminConversationItem({
  conversation,
  active,
  advisors,
  onSelect,
  onAssign,
}: {
  conversation: AdminConversation;
  active: boolean;
  advisors: AdminAdvisor[];
  onSelect: () => void;
  onAssign: (advisorId: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border px-3.5 py-3 transition-colors duration-200",
        active ? "border-brand/20 bg-brand-soft" : "border-transparent hover:bg-canvas",
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left">
        <div className="relative shrink-0">
          <InitialsAvatar initials={getInitials(conversation.customerName)} />
          {conversation.online && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-success" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">
              {conversation.customerName}
              {conversation.channel === "messenger" ? (
                <span className="ml-1.5 text-[10px] font-medium text-brand">Messenger</span>
              ) : null}
            </p>
            <span className="shrink-0 text-[11px] text-muted">{conversation.lastMessageTime}</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p className="truncate text-[13px] text-muted">{conversation.lastMessage}</p>
            {conversation.unread > 0 && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white">
                {conversation.unread}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <AdminLeadStatusBadge status={conversation.status} />
            {conversation.assignedAdvisor && (
              <span className="text-[11px] text-muted">{conversation.assignedAdvisor.name}</span>
            )}
          </div>
        </div>
      </button>
      <Select
        value={conversation.assignedAdvisor?.id ?? "none"}
        onValueChange={(v) => v !== "none" && onAssign(v)}
      >
        <SelectTrigger className="h-8 text-[12px]">
          <SelectValue placeholder="Asignar asesora" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Sin asignar</SelectItem>
          {advisors.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
