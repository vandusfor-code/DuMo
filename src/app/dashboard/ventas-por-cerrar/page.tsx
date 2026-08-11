"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { ChatWindow } from "@/components/leads/chat-window";
import { EmptyConversation } from "@/components/leads/empty-conversation";
import { SectionCard } from "@/components/leads/premium/section-card";
import { AdvisorDuoTable } from "@/components/dashboard/ventas-por-cerrar/advisor-duo-table";
import { DuoCaseDetailPanel } from "@/components/dashboard/ventas-por-cerrar/duo-case-detail-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useConversationMessages, useMarkConversationRead } from "@/hooks/use-leads";
import { useAdvisorVentasPorCerrar } from "@/hooks/use-ventas-por-cerrar";
import { resolveConversationChannel } from "@/lib/conversation-channel";
import type { DuoSale } from "@/types/duo-sale";
import type { Conversation } from "@/types/conversation";

function duoSaleToConversation(sale: DuoSale): Conversation {
  return {
    id: sale.conversationId,
    customerName: sale.customerName || "Sin nombre",
    phone: sale.phone,
    rut: sale.rut,
    channel: resolveConversationChannel(sale.conversationId),
    lastMessage: "",
    lastMessageTime: "",
    unread: 0,
    status: "in_progress",
    online: false,
    inboxState: "active",
  };
}

/**
 * DUO-3 — vista de la asesora de cierre. Mismo patrón de interacción que
 * Recuperación (P5): lista → seleccionar caso → chat + panel de detalle.
 * A diferencia de Recuperación, el panel de la derecha NO deja tipificar
 * como venta — eso es DUO-4 (el flujo de cierre con pago real).
 */
export default function VentasPorCerrarAdvisorPage() {
  const { data, isLoading, isError, refetch } = useAdvisorVentasPorCerrar();
  const [selected, setSelected] = useState<DuoSale | null>(null);

  const selectedConversation = useMemo(
    () => (selected ? duoSaleToConversation(selected) : null),
    [selected],
  );

  const messages = useConversationMessages(selectedConversation?.id ?? null);
  const markRead = useMarkConversationRead();

  const openChat = (sale: DuoSale) => {
    setSelected(sale);
    markRead.mutate(sale.conversationId);
  };

  // Refleja notas nuevas / reasignaciones sin perder el caso abierto.
  const selectedFresh = useMemo(
    () => (selected ? (data?.find((s) => s.id === selected.id) ?? selected) : null),
    [selected, data],
  );

  const chatOpen = Boolean(selectedConversation);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-canvas p-4 lg:p-5">
      <div className="mb-4 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-ink">Ventas por cerrar</h1>
            <p className="mt-1 text-[13px] text-muted">
              Casos de Operación Duo asignados a ti — contacta al cliente y cierra por llamada.
            </p>
          </div>
          {chatOpen ? (
            <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
              <ArrowLeft className="size-4" />
              Volver a la lista
            </Button>
          ) : null}
        </div>
      </div>

      {!chatOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isError && !data ? (
            <ErrorState
              title="No se pudieron cargar tus ventas por cerrar"
              onRetry={() => refetch()}
            />
          ) : isLoading && !data ? (
            <Skeleton className="h-[480px] rounded-card" />
          ) : (
            <AdvisorDuoTable data={data ?? []} onOpen={openChat} />
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
            {selectedFresh ? <DuoCaseDetailPanel sale={selectedFresh} /> : <EmptyConversation />}
          </SectionCard>
        </div>
      )}
    </div>
  );
}
