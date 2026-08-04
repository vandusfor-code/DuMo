"use client";

import { useMemo, useState } from "react";
import { SquarePen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ConversationSearch } from "./conversation-search";
import {
  ConversationFilters,
  type ConversationFilter,
} from "./conversation-filters";
import { ConversationItem } from "./conversation-item";
import { CoexistenceButton } from "./coexistence-button";
import type { Conversation } from "@/types/conversation";

export function ConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");

  const counts = useMemo(() => {
    const base: Record<ConversationFilter, number> = {
      all: conversations.length,
      new: 0,
      in_progress: 0,
      converted: 0,
      lost: 0,
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
        c.lastMessage.toLowerCase().includes(q);
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
        <ConversationFilters value={filter} onChange={setFilter} counts={counts} />
        <CoexistenceButton />
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
          <p className="px-4 py-10 text-center text-[13px] text-muted">
            No hay conversaciones que coincidan.
          </p>
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={c.id === selectedId}
              onClick={() => onSelect(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
