"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { ErrorState } from "@/components/shared/error-state";
import { AdminConversationList } from "@/components/admin/leads/admin-conversation-list";
import { AdminChatPanel } from "@/components/admin/leads/admin-chat-panel";
import { AdminLeadFormPanel } from "@/components/admin/leads/admin-lead-form-panel";
import {
  useAdminAdvisors,
  useAdminConversations,
  useAdminLeadDetail,
  useAdminMessages,
  useAssignAdvisor,
} from "@/hooks/use-admin-leads";

export default function AdminLeadsPage() {
  const { data: conversations, isLoading, isError, refetch } = useAdminConversations();
  const { data: advisors = [] } = useAdminAdvisors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const assign = useAssignAdvisor();

  const selected = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const detail = useAdminLeadDetail(selectedId);
  const messages = useAdminMessages(selectedId);

  if (isError) {
    return (
      <div className="pt-4">
        <ErrorState title="No se pudieron cargar las conversaciones" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="-mx-6 -mb-12 h-[calc(100dvh-0px)] sm:-mx-8 lg:-mx-10">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[24fr_41fr_35fr]">
        <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-l-0 shadow-none">
          <AdminConversationList
            conversations={conversations ?? []}
            advisors={advisors}
            isLoading={isLoading}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAssign={(conversationId, advisorId) =>
              assign.mutate({ conversationId, advisorId })
            }
          />
        </Card>

        {selected ? (
          <>
            <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 shadow-none">
              <AdminChatPanel
                conversation={selected}
                messages={messages.data ?? []}
                isLoading={messages.isLoading}
              />
            </Card>
            <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
              {detail.data ? (
                <AdminLeadFormPanel
                  key={selected.id}
                  conversation={detail.data.conversation}
                  client={detail.data.client}
                  notes={detail.data.notes}
                  timeline={detail.data.timeline}
                />
              ) : null}
            </Card>
          </>
        ) : (
          <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none lg:col-span-2">
            <EmptyConversation />
          </Card>
        )}
      </div>
    </div>
  );
}
