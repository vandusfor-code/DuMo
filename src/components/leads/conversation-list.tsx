"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal, SquarePen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ConversationSearch } from "./conversation-search";
import {
  ConversationFilters,
  type ConversationFilter,
} from "./conversation-filters";
import { ConversationItem } from "./conversation-item";
import { ConversationAvatarItem } from "./conversation-avatar-item";
import { ManualMessageModal } from "./manual-message-modal";
import type { Conversation } from "@/types/conversation";

export function ConversationList({
  conversations,
  isLoading,
  isError,
  isSyncing,
  onRetry,
  selectedId,
  onSelect,
  collapsed,
  onCollapsedChange,
}: {
  conversations: Conversation[];
  isLoading: boolean;
  isError?: boolean;
  isSyncing?: boolean;
  onRetry?: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [manualMessageOpen, setManualMessageOpen] = useState(false);

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

  const listBody = isLoading ? (
    collapsed ? (
      <div className="flex flex-col items-center gap-3 py-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="size-11 rounded-full" />
        ))}
      </div>
    ) : (
      Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      ))
    )
  ) : isError ? (
    <div className={cn("py-10 text-center", collapsed ? "px-1" : "px-4")}>
      {!collapsed && (
        <>
          <p className="text-[14px] font-medium text-ink">No se pudo cargar la bandeja</p>
          <p className="mt-1 text-[13px] text-muted">Revisa tu conexión.</p>
        </>
      )}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-[12px] font-semibold text-brand hover:text-brand-hover"
        >
          Reintentar
        </button>
      ) : null}
    </div>
  ) : filtered.length === 0 ? (
    !collapsed ? (
      <p className="px-4 py-10 text-center text-[13px] text-muted">
        No hay conversaciones que coincidan.
      </p>
    ) : null
  ) : collapsed ? (
    filtered.map((c) => (
      <ConversationAvatarItem
        key={c.id}
        conversation={c}
        active={c.id === selectedId}
        onClick={() => onSelect(c.id)}
      />
    ))
  ) : (
    filtered.map((c) => (
      <ConversationItem
        key={c.id}
        conversation={c}
        active={c.id === selectedId}
        onClick={() => onSelect(c.id)}
      />
    ))
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!collapsed ? (
        <div className="space-y-4 border-b border-line px-5 pb-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-semibold leading-[1.45] text-ink">Conversaciones</h2>
              {isSyncing ? (
                <span className="text-[12px] font-medium text-muted">Sincronizando…</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Filtrar"
                className="grid size-9 place-items-center rounded-btn text-muted transition-colors duration-200 hover:bg-hover hover:text-ink"
              >
                <SlidersHorizontal className="size-[18px]" />
              </button>
              <button
                type="button"
                aria-label="Nueva conversación"
                title="Nueva conversación"
                onClick={() => setManualMessageOpen(true)}
                className="grid size-9 place-items-center rounded-btn bg-brand text-white transition-colors hover:bg-brand-hover"
              >
                <SquarePen className="size-[18px]" />
              </button>
            </div>
          </div>
          <ConversationSearch value={search} onChange={setSearch} />
          <ConversationFilters value={filter} onChange={setFilter} counts={counts} />
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

      <ManualMessageModal
        open={manualMessageOpen}
        onClose={() => setManualMessageOpen(false)}
        onSent={(conversationId) => onSelect(conversationId)}
      />
    </div>
  );
}
