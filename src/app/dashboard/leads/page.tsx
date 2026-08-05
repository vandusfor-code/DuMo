"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/leads/conversation-list";
import { ChatWindow } from "@/components/leads/chat-window";
import { LeadFormPanel } from "@/components/leads/lead-form-panel";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { ErrorState } from "@/components/shared/error-state";
import { useConversations, useConversationMessages } from "@/hooks/use-leads";
import type { Conversation } from "@/types/conversation";

export default function LeadsPage() {
  const { data: conversations, isLoading, isError, refetch } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo<Conversation | null>(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const messages = useConversationMessages(selectedId);

  if (isError) {
    return (
      <div className="pt-4">
        <ErrorState
          title="No se pudieron cargar las conversaciones"
          message="Revisa la conexión e intenta nuevamente."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[24fr_41fr_35fr]">
      {/* Column 1 — conversations */}
      <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-l-0 shadow-none">
        <ConversationList
          conversations={conversations ?? []}
          isLoading={isLoading}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </Card>

      {/* Columns 2 & 3 */}
      {selected ? (
        <>
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 shadow-none">
            <ChatWindow
              conversation={selected}
              messages={messages.data ?? []}
              isLoading={messages.isLoading}
            />
          </Card>
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
            <LeadFormPanel key={selected.id} conversation={selected} />
          </Card>
        </>
      ) : (
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none lg:col-span-2">
          <EmptyConversation />
        </Card>
      )}
    </div>
  );
}
