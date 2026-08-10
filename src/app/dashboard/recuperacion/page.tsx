"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ChatWindow } from "@/components/leads/chat-window";
import { LeadFormPanel } from "@/components/leads/lead-form-panel";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { SectionCard } from "@/components/leads/premium/section-card";
import { RecuperacionFilters, EMPTY_RECUPERACION_FILTERS, type RecuperacionAppliedFilters } from "@/components/dashboard/recuperacion/recuperacion-filters";
import { RecuperacionKpis } from "@/components/dashboard/recuperacion/recuperacion-kpis";
import { RecuperacionTable } from "@/components/dashboard/recuperacion/recuperacion-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useAdvisorRecuperacion } from "@/hooks/use-advisor-recuperacion";
import { useConversationMessages } from "@/hooks/use-leads";
import { resolveConversationChannel } from "@/lib/conversation-channel";
import type { AdvisorRecuperacionFilters, AdvisorRecuperacionRow } from "@/types/advisor-recuperacion";
import type { Conversation } from "@/types/conversation";

function rowToConversation(row: AdvisorRecuperacionRow): Conversation {
  return {
    id: row.conversationId,
    customerName: row.customerName || "Sin nombre",
    phone: row.phone,
    rut: "",
    channel: resolveConversationChannel(row.conversationId),
    lastMessage: row.note || "",
    lastMessageTime: row.followUpDateLabel,
    unread: 0,
    status: "in_progress",
    online: false,
    inboxState: "active",
  };
}

export default function RecuperacionPage() {
  return (
    <Suspense fallback={null}>
      <RecuperacionPageContent />
    </Suspense>
  );
}

function RecuperacionPageContent() {
  const searchParams = useSearchParams();
  const conversationFromUrl = searchParams.get("conversationId");
  const [applied, setApplied] = useState<RecuperacionAppliedFilters>(EMPTY_RECUPERACION_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<AdvisorRecuperacionRow | null>(null);

  const filters: AdvisorRecuperacionFilters = {
    ...applied,
    page,
    pageSize: 10,
  };

  const { data, isLoading, isError, refetch } = useAdvisorRecuperacion(filters);

  useEffect(() => {
    if (!conversationFromUrl || !data?.rows.length) return;
    const match = data.rows.find((r) => r.conversationId === conversationFromUrl);
    if (match) setSelectedRow(match);
  }, [conversationFromUrl, data?.rows]);

  useEffect(() => {
    if (!selectedRow || !data?.rows) return;
    const stillVisible = data.rows.some((r) => r.id === selectedRow.id);
    if (!stillVisible) setSelectedRow(null);
  }, [data?.rows, selectedRow]);

  const tipificationOptions = useMemo(() => {
    const fromSummary = data?.summary.byType ?? [];
    return [...fromSummary].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [data?.summary.byType]);

  const selectedConversation = useMemo(
    () => (selectedRow ? rowToConversation(selectedRow) : null),
    [selectedRow],
  );

  const messages = useConversationMessages(selectedConversation?.id ?? null);

  const apply = (f: RecuperacionAppliedFilters) => {
    setApplied(f);
    setPage(1);
  };

  const clear = () => {
    setApplied(EMPTY_RECUPERACION_FILTERS);
    setPage(1);
  };

  const chatOpen = Boolean(selectedConversation);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas p-4 lg:p-5">
      <div className="mb-4 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink">Recuperación</h1>
            <p className="mt-1 text-[13px] text-muted">
              Leads transferidos desde Pendientes — gestiona y cierra desde aquí.
            </p>
          </div>
          {chatOpen ? (
            <Button variant="outline" size="sm" onClick={() => setSelectedRow(null)}>
              <ArrowLeft className="size-4" />
              Volver a la lista
            </Button>
          ) : null}
        </div>
      </div>

      {!chatOpen ? (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          <RecuperacionFilters
            tipificationOptions={tipificationOptions}
            onApply={apply}
            onClear={clear}
          />

          {isError && !data ? (
            <ErrorState title="No se pudo cargar recuperación" onRetry={() => refetch()} />
          ) : isLoading || !data ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-card" />
                ))}
              </div>
              <Skeleton className="h-[480px] rounded-card" />
            </div>
          ) : (
            <>
              <RecuperacionKpis summary={data.summary} />
              <RecuperacionTable
                data={data.rows}
                total={data.total}
                page={page}
                pageSize={10}
                selectedConversationId={selectedRow?.conversationId ?? null}
                onOpenChat={setSelectedRow}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(0,1.75fr)_minmax(260px,0.95fr)] xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.9fr)]">
          <SectionCard className="flex min-h-0 flex-col overflow-hidden p-0">
            <ChatWindow
              conversation={selectedConversation!}
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
            {selectedConversation ? (
              <LeadFormPanel key={selectedConversation.id} conversation={selectedConversation} />
            ) : (
              <EmptyConversation />
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
