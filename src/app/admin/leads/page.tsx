"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { SectionCard } from "@/components/leads/premium/section-card";
import { shouldShowFatalQueryError } from "@/components/shared/query-state";
import { ErrorState } from "@/components/shared/error-state";
import { AdminConversationList } from "@/components/admin/leads/admin-conversation-list";
import { AdminChatPanel } from "@/components/admin/leads/admin-chat-panel";
import { AdminLeadFormPanel } from "@/components/admin/leads/admin-lead-form-panel";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  useAdminAdvisors,
  useAdminConversations,
  useAdminLeadDetail,
  useAdminMessages,
  useAssignAdvisor,
  useAutoAssignSettings,
  useDeleteAllConversations,
  useDeleteConversation,
  useSetAutoAssign,
} from "@/hooks/use-admin-leads";
import { cn } from "@/lib/utils";

const LIST_COLLAPSED_KEY = "dumo-admin-leads-list-collapsed";

export default function AdminLeadsPage() {
  return (
    <Suspense fallback={null}>
      <AdminLeadsPageContent />
    </Suspense>
  );
}

function AdminLeadsPageContent() {
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversationId");
  const convQuery = useAdminConversations();
  const { data: conversations, isLoading, refetch } = convQuery;
  const { data: advisors = [] } = useAdminAdvisors();
  const { data: autoAssign } = useAutoAssignSettings();
  const setAutoAssign = useSetAutoAssign();
  const [selectedId, setSelectedId] = useState<string | null>(conversationFromUrl);
  const [listCollapsed, setListCollapsed] = useState(false);
  const assign = useAssignAdvisor();

  const deleteOne = useDeleteConversation();
  const deleteAll = useDeleteAllConversations();
  const [confirmDeleteOne, setConfirmDeleteOne] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  useEffect(() => {
    if (conversationFromUrl) setSelectedId(conversationFromUrl);
  }, [conversationFromUrl]);

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

  const selected = useMemo(
    () => conversations?.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const detail = useAdminLeadDetail(selectedId);
  const messages = useAdminMessages(selectedId);
  const list = conversations ?? [];

  if (shouldShowFatalQueryError(convQuery)) {
    return (
      <div className="pt-4">
        <ErrorState title="No se pudieron cargar las conversaciones" onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="leads-crm -mx-6 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-canvas sm:-mx-8 lg:-mx-10 lg:h-[calc(100dvh-5rem)]">
      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:p-5 transition-[grid-template-columns] duration-200 ease-out",
          listCollapsed
            ? "lg:grid-cols-[72px_minmax(300px,540px)_minmax(440px,1fr)] xl:grid-cols-[72px_minmax(320px,560px)_minmax(480px,1fr)]"
            : "lg:grid-cols-[minmax(280px,340px)_minmax(300px,540px)_minmax(440px,1fr)] xl:grid-cols-[360px_minmax(320px,560px)_minmax(480px,1fr)]",
        )}
      >
        <SectionCard className="flex min-h-0 flex-col overflow-hidden">
          {convQuery.isError && list.length > 0 && !listCollapsed ? (
            <div className="border-b border-line bg-warning-soft px-5 py-2.5 text-[12px] text-warning-ink">
              No se pudo sincronizar. Mostrando la última versión.{" "}
              <button type="button" onClick={() => refetch()} className="font-semibold underline">
                Reintentar
              </button>
            </div>
          ) : null}
          <AdminConversationList
            conversations={list}
            advisors={advisors}
            isLoading={isLoading && list.length === 0}
            selectedId={selectedId}
            autoAssignEnabled={autoAssign?.enabled ?? false}
            autoAssignLoading={setAutoAssign.isPending}
            onSelect={setSelectedId}
            onAssign={(conversationId, advisorId) =>
              assign.mutate({ conversationId, advisorId })
            }
            onToggleAutoAssign={(enabled) => setAutoAssign.mutate(enabled)}
            collapsed={listCollapsed}
            onCollapsedChange={handleListCollapsed}
          />
          {list.length > 0 && !listCollapsed ? (
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
          ) : null}
        </SectionCard>

        {selected ? (
          <>
            <SectionCard className="relative flex min-h-0 flex-col overflow-hidden p-0">
              <button
                type="button"
                aria-label="Eliminar chat"
                title="Eliminar este chat y su historial"
                onClick={() => setConfirmDeleteOne(selected.id)}
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-lg bg-card/90 text-muted shadow-sm backdrop-blur transition-colors hover:bg-danger-soft hover:text-danger-ink"
              >
                <Trash2 className="size-[18px]" />
              </button>
              <AdminChatPanel
                conversation={selected}
                messages={messages.data ?? []}
                isLoading={messages.isLoading}
                isError={messages.isError}
                errorMessage={
                  messages.error instanceof Error ? messages.error.message : undefined
                }
                onRetry={() => messages.refetch()}
              />
            </SectionCard>
            <SectionCard className="flex min-h-0 flex-col overflow-hidden">
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
            </SectionCard>
          </>
        ) : (
          <SectionCard className="flex min-h-0 flex-col overflow-hidden lg:col-span-2">
            <EmptyConversation />
          </SectionCard>
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
