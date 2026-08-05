"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { shouldShowFatalQueryError } from "@/components/shared/query-state";
import { ErrorState } from "@/components/shared/error-state";
import { AdminConversationList } from "@/components/admin/leads/admin-conversation-list";
import { AdminChatPanel } from "@/components/admin/leads/admin-chat-panel";
import { AdminLeadFormPanel } from "@/components/admin/leads/admin-lead-form-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  useAdminAdvisors,
  useAdminConversations,
  useAdminLeadDetail,
  useAdminMessages,
  useAdminSendMessage,
  useAssignAdvisor,
  useAutoAssignSettings,
  useDeleteAllConversations,
  useDeleteConversation,
  useSetAutoAssign,
} from "@/hooks/use-admin-leads";

export default function AdminLeadsPage() {
  const convQuery = useAdminConversations();
  const { data: conversations, isLoading, refetch } = convQuery;
  const { data: advisors = [] } = useAdminAdvisors();
  const { data: autoAssign } = useAutoAssignSettings();
  const setAutoAssign = useSetAutoAssign();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const assign = useAssignAdvisor();

  const selected = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const detail = useAdminLeadDetail(selectedId);
  const messages = useAdminMessages(selectedId);
  const sendMessage = useAdminSendMessage(selectedId);

  // Borrado de chats (solo admin). Ambas acciones piden confirmación.
  const deleteOne = useDeleteConversation();
  const deleteAll = useDeleteAllConversations();
  const [confirmDeleteOne, setConfirmDeleteOne] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  if (shouldShowFatalQueryError(convQuery)) {
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
            autoAssignEnabled={autoAssign?.enabled ?? false}
            autoAssignLoading={setAutoAssign.isPending}
            onSelect={setSelectedId}
            onAssign={(conversationId, advisorId) =>
              assign.mutate({ conversationId, advisorId })
            }
            onToggleAutoAssign={(enabled) => setAutoAssign.mutate(enabled)}
          />
          {(conversations?.length ?? 0) > 0 && (
            <div className="shrink-0 border-t border-line p-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteAll(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-danger/25 px-3 py-2 text-[13px] font-semibold text-danger-ink transition-colors hover:bg-danger-soft"
              >
                <Trash2 className="size-4" />
                Borrar todos los chats
              </button>
            </div>
          )}
        </Card>

        {selected ? (
          <>
            <Card className="relative flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 shadow-none">
              <button
                type="button"
                aria-label="Eliminar chat"
                title="Eliminar este chat y su historial"
                onClick={() => setConfirmDeleteOne(selected.id)}
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger-ink"
              >
                <Trash2 className="size-[18px]" />
              </button>
              <AdminChatPanel
                conversation={selected}
                messages={messages.data ?? []}
                isLoading={messages.isLoading}
                isSending={sendMessage.isPending}
                sendError={sendMessage.error instanceof Error ? sendMessage.error.message : null}
                onSend={async (text) => {
                  await sendMessage.mutateAsync({ to: selected.phone, text });
                }}
              />
            </Card>
            <Card className="flex min-h-0 flex-col overflow-hidden rounded-none border-y-0 border-r-0 shadow-none">
              {detail.isLoading && !detail.data ? (
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-32 rounded-card" />
                  <Skeleton className="h-48 rounded-card" />
                </div>
              ) : detail.data ? (
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

      <ConfirmDialog
        open={confirmDeleteOne !== null}
        title="Eliminar este chat"
        description="Se borrará la conversación con todos sus mensajes y notas. Esta acción no se puede deshacer. Las ventas registradas no se ven afectadas."
        confirmLabel="Eliminar chat"
        isLoading={deleteOne.isPending}
        onCancel={() => setConfirmDeleteOne(null)}
        onConfirm={async () => {
          if (!confirmDeleteOne) return;
          await deleteOne.mutateAsync(confirmDeleteOne);
          if (selectedId === confirmDeleteOne) setSelectedId(null);
          setConfirmDeleteOne(null);
        }}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        title="Borrar TODOS los chats"
        description="Se eliminarán todas las conversaciones con su historial completo de mensajes y notas. Esta acción no se puede deshacer. Las ventas registradas no se ven afectadas."
        confirmLabel="Borrar todo"
        confirmPhrase="BORRAR TODO"
        isLoading={deleteAll.isPending}
        onCancel={() => setConfirmDeleteAll(false)}
        onConfirm={async () => {
          await deleteAll.mutateAsync();
          setSelectedId(null);
          setConfirmDeleteAll(false);
        }}
      />
    </div>
  );
}
