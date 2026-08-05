"use client";

import { useMemo, useState } from "react";
import { SquarePen, Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSearch } from "@/components/leads/conversation-search";
import type { AdminAdvisor, AdminConversation, AdminLeadFilter } from "@/types/admin-lead";
import { AdminConversationFilters } from "./admin-conversation-filters";
import { AdminConversationItem } from "./admin-conversation-item";
import { cn } from "@/lib/utils";

export function AdminConversationList({
  conversations,
  advisors,
  isLoading,
  selectedId,
  autoAssignEnabled,
  autoAssignLoading,
  onSelect,
  onAssign,
  onToggleAutoAssign,
}: {
  conversations: AdminConversation[];
  advisors: AdminAdvisor[];
  isLoading: boolean;
  selectedId: string | null;
  autoAssignEnabled: boolean;
  autoAssignLoading?: boolean;
  onSelect: (id: string) => void;
  onAssign: (conversationId: string, advisorId: string) => void;
  onToggleAutoAssign: (enabled: boolean) => void;
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

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Conversaciones</h2>
          <button
            type="button"
            aria-label="Nueva conversación"
            className="grid size-9 place-items-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover"
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

        <ConversationSearch value={search} onChange={setSearch} />
        <AdminConversationFilters value={filter} onChange={setFilter} counts={counts} />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-muted">No hay conversaciones.</p>
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
        )}
      </div>
    </div>
  );
}
