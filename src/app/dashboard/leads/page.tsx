"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConversationList } from "@/components/leads/conversation-list";
import { ChatWindow } from "@/components/leads/chat-window";
import { LeadFormPanel } from "@/components/leads/lead-form-panel";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { SectionCard } from "@/components/leads/premium/section-card";
import { useConversations, useConversationMessages, useMarkConversationRead } from "@/hooks/use-leads";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/conversation";

const LIST_COLLAPSED_KEY = "dumo-leads-list-collapsed";

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversationId");
  const { data: conversations, isLoading, isError, isFetching, refetch } = useConversations();
  const markRead = useMarkConversationRead();
  const [selectedId, setSelectedId] = useState<string | null>(conversationFromUrl);
  const [listCollapsed, setListCollapsed] = useState(false);

  useEffect(() => {
    if (conversationFromUrl) {
      setSelectedId(conversationFromUrl);
      markRead.mutate(conversationFromUrl);
    }
  }, [conversationFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      setListCollapsed(localStorage.getItem(LIST_COLLAPSED_KEY) === "1");
    } catch {
      /* storage no disponible */
    }
  }, []);

  const handleListCollapsed = (collapsed: boolean) => {
    setListCollapsed(collapsed);
    try {
      localStorage.setItem(LIST_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage no disponible */
    }
  };

  const selected = useMemo<Conversation | null>(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messages = useConversationMessages(selectedId);
  const list = conversations ?? [];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    markRead.mutate(id);
  };

  return (
    <div className="leads-crm flex h-full min-h-0 flex-col overflow-hidden bg-canvas p-4 lg:p-5">
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-hidden transition-[grid-template-columns] duration-200 ease-out",
          listCollapsed
            ? "lg:grid-cols-[72px_minmax(0,1.75fr)_minmax(260px,0.95fr)] xl:grid-cols-[72px_minmax(0,1.85fr)_minmax(280px,0.9fr)]"
            : "lg:grid-cols-[minmax(280px,340px)_minmax(0,1.75fr)_minmax(260px,0.95fr)] xl:grid-cols-[360px_minmax(0,1.85fr)_minmax(280px,0.9fr)]",
        )}
      >
        <SectionCard className="flex min-h-0 flex-col overflow-hidden">
          {isError && list.length > 0 && !listCollapsed ? (
            <div className="border-b border-line bg-warning-soft px-5 py-2.5 text-[12px] text-warning-ink">
              No se pudo sincronizar. Mostrando la última versión.{" "}
              <button type="button" onClick={() => refetch()} className="font-semibold underline">
                Reintentar
              </button>
            </div>
          ) : null}
          <ConversationList
            conversations={list}
            isLoading={isLoading && list.length === 0}
            isError={isError && list.length === 0}
            isSyncing={isFetching && list.length > 0}
            onRetry={() => refetch()}
            selectedId={selectedId}
            onSelect={handleSelect}
            collapsed={listCollapsed}
            onCollapsedChange={handleListCollapsed}
          />
        </SectionCard>

        {selected ? (
          <>
            <SectionCard className="flex min-h-0 flex-col overflow-hidden p-0">
              <ChatWindow
                conversation={selected}
                messages={messages.data ?? []}
                isLoading={messages.isLoading}
                isError={messages.isError && !(messages.data?.length)}
                errorMessage={
                  messages.error instanceof Error ? messages.error.message : undefined
                }
                onRetry={() => messages.refetch()}
                uiTheme="premium"
              />
            </SectionCard>
            <SectionCard className="flex min-h-0 flex-col overflow-hidden">
              <LeadFormPanel
                key={selected.id}
                conversation={selected}
                onInboxClosed={() => setSelectedId(null)}
              />
            </SectionCard>
          </>
        ) : (
          <SectionCard className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
            <EmptyConversation />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
