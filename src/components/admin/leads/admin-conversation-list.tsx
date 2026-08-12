"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, SquarePen, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSearch } from "@/components/leads/conversation-search";
import { ConversationAvatarItem } from "@/components/leads/conversation-avatar-item";
import type { AdminAdvisor, AdminConversation, AdminLeadFilter } from "@/types/admin-lead";
import type { Conversation } from "@/types/conversation";
import { AdminConversationFilters } from "./admin-conversation-filters";
import { AdminConversationItem } from "./admin-conversation-item";
import { cn } from "@/lib/utils";

function toConversation(c: AdminConversation): Conversation {
  return {
    id: c.id,
    customerName: c.customerName,
    phone: c.phone,
    rut: c.rut,
    lastMessage: c.lastMessage,
    lastMessageTime: c.lastMessageTime,
    unread: c.unread,
    status: "in_progress",
    online: c.online,
  };
}

export function AdminConversationList({
  conversations,
  advisors,
  isLoading,
  selectedId,
  autoAssignEnabled,
  autoAssignLoading,
  slaAutoReassignEnabled,
  slaAutoReassignLoading,
  onSelect,
  onAssign,
  onToggleAutoAssign,
  onToggleSlaAutoReassign,
  collapsed = false,
  onCollapsedChange,
}: {
  conversations: AdminConversation[];
  advisors: AdminAdvisor[];
  isLoading: boolean;
  selectedId: string | null;
  autoAssignEnabled: boolean;
  autoAssignLoading?: boolean;
  slaAutoReassignEnabled: boolean;
  slaAutoReassignLoading?: boolean;
  onSelect: (id: string) => void;
  onAssign: (conversationId: string, advisorId: string) => void;
  onToggleAutoAssign: (enabled: boolean) => void;
  onToggleSlaAutoReassign: (enabled: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<AdminLeadFilter>("all");

  const counts = useMemo(() => {
    const base: Record<AdminLeadFilter, number> = {
      all: conversations.length,
      nuevo: 0,
      asignado: 0,
      contactado: 0,
      negociacion: 0,
      convertido: 0,
      perdido: 0,
    };
    for (const c of conversations) base[c.status] += 1;
    return base;
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchesFilter = filter === "all" || c.status === filter;
      const matchesSearch =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.lastMessage.toLowerCase().includes(q) ||
        (c.assignedAdvisor?.name.toLowerCase().includes(q) ?? false);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, search, filter]);

  const listBody = isLoading ? (
    collapsed ? (
      <div className="flex flex-col items-center gap-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-11 rounded-full" />
        ))}
      </div>
    ) : (
      Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3.5 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      ))
    )
  ) : filtered.length === 0 ? (
    !collapsed ? (
      <p className="px-4 py-8 text-center text-[13px] text-muted">No hay conversaciones.</p>
    ) : null
  ) : collapsed ? (
    filtered.map((c) => (
      <ConversationAvatarItem
        key={c.id}
        conversation={toConversation(c)}
        active={c.id === selectedId}
        onClick={() => onSelect(c.id)}
      />
    ))
  ) : (
    filtered.map((c) => (
      <AdminConversationItem
        key={c.id}
        conversation={c}
        active={c.id === selectedId}
        advisors={advisors}
        onSelect={() => onSelect(c.id)}
        onAssign={(advisorId) => onAssign(c.id, advisorId)}
      />
    ))
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!collapsed ? (
        <div className="space-y-4 border-b border-line px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold leading-[1.45] text-ink">Conversaciones</h2>
            <button
              type="button"
              aria-label="Nueva conversación"
              className="grid size-9 place-items-center rounded-btn bg-brand text-white transition-colors hover:bg-brand-hover"
            >
              <SquarePen className="size-[18px]" />
            </button>
          </div>

          <button
            type="button"
            disabled={autoAssignLoading}
            onClick={() => onToggleAutoAssign(!autoAssignEnabled)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
              autoAssignEnabled
                ? "border-brand/30 bg-brand-soft"
                : "border-line bg-canvas hover:bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <Zap className={cn("size-4", autoAssignEnabled ? "text-brand" : "text-muted")} />
              <div>
                <p className="text-[13px] font-semibold text-ink">Asignación automática</p>
                <p className="text-[11px] text-muted">
                  {autoAssignEnabled
                    ? "Activa — nuevos chats van a asesoras conectadas"
                    : "Inactiva — asignación manual"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                autoAssignEnabled ? "bg-brand" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                  autoAssignEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </span>
          </button>

          <button
            type="button"
            disabled={slaAutoReassignLoading}
            onClick={() => onToggleSlaAutoReassign(!slaAutoReassignEnabled)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors",
              slaAutoReassignEnabled
                ? "border-brand/30 bg-brand-soft"
                : "border-line bg-canvas hover:bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("size-4", slaAutoReassignEnabled ? "text-brand" : "text-muted")} />
              <div>
                <p className="text-[13px] font-semibold text-ink">Alerta de respuesta automática</p>
                <p className="text-[11px] text-muted">
                  {slaAutoReassignEnabled
                    ? "Activa — avisa y reasigna chats sin responder"
                    : "Inactiva — sin avisos ni reasignación automática"}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                slaAutoReassignEnabled ? "bg-brand" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                  slaAutoReassignEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </span>
          </button>

          <ConversationSearch value={search} onChange={setSearch} />
          <AdminConversationFilters value={filter} onChange={setFilter} counts={counts} />
        </div>
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          collapsed ? "space-y-3 px-2 py-3" : "space-y-1 p-3",
        )}
      >
        {listBody}
      </div>

      {onCollapsedChange ? (
        <div className="shrink-0 border-t border-line bg-hover/50 px-2 py-2">
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            aria-label={collapsed ? "Expandir conversaciones" : "Recoger conversaciones"}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-center rounded-btn py-2 text-muted transition-colors duration-200 hover:bg-hover hover:text-ink"
          >
            {collapsed ? (
              <ChevronRight className="size-[18px]" />
            ) : (
              <ChevronLeft className="size-[18px]" />
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
