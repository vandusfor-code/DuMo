"use client";

import { useMemo, useState } from "react";
import { SquarePen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSearch } from "@/components/leads/conversation-search";
import type { AdminAdvisor, AdminConversation, AdminLeadFilter } from "@/types/admin-lead";
import { AdminConversationFilters } from "./admin-conversation-filters";
import { AdminConversationItem } from "./admin-conversation-item";

export function AdminConversationList({
  conversations,
  advisors,
  isLoading,
  selectedId,
  onSelect,
  onAssign,
}: {
  conversations: AdminConversation[];
  advisors: AdminAdvisor[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAssign: (conversationId: string, advisorId: string) => void;
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
