"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LeadTypeSelect } from "./lead-type-select";
import { SaleDetails } from "./sale-details";
import { ObservationField } from "./observation-field";
import { FollowUpDateField } from "./follow-up-date-field";
import { ActionButtons } from "./action-buttons";
import { ClientIdentityFields, ClientPhoneField } from "./client-card";
import { SalesScriptTab } from "./sales-script-tab";
import { OfferEngineTab } from "./offer-engine/offer-engine-tab";
import { useSalesScript } from "@/hooks/use-sales-script";
import {
  SectionCard,
  SectionCardBody,
  SectionCardHeader,
} from "@/components/leads/premium/section-card";
import { StatusBadge } from "@/components/leads/premium/status-badge";
import { DynamicTipificationBadge } from "@/components/shared/dynamic-tipification-badge";
import type { Conversation } from "@/types/conversation";
import type { LeadFormValues } from "@/types/lead-form";
import type { GeneratedSalesScript } from "@/types/sales-script";
import type { SaveLeadAction } from "@/types/crm-client";
import { cn } from "@/lib/utils";
import { useSaleFlowType } from "@/hooks/use-tipification-catalog";

export function LeadPanel({
  conversation,
  isSaving,
  isError,
  errorMessage,
  isSuccess,
  hasSavedGestion = false,
  onCancel,
  savedScript,
  scriptUnavailableReason,
  saleError,
  saleRegistered = false,
  lastSaveAction = null,
  clientError,
  clientSaved = false,
  onSaveSale,
  onGenerateScript,
  onClose,
}: {
  conversation: Conversation;
  isSaving: boolean;
  isError: boolean;
  errorMessage?: string;
  isSuccess: boolean;
  hasSavedGestion?: boolean;
  onCancel: () => void;
  onSaveSale: () => void;
  onGenerateScript: () => void;
  onClose: () => void;
  savedScript?: GeneratedSalesScript | null;
  scriptUnavailableReason?: string | null;
  saleError?: string | null;
  saleRegistered?: boolean;
  lastSaveAction?: SaveLeadAction | null;
  clientError?: string | null;
  clientSaved?: boolean;
}) {
  const { control } = useFormContext<LeadFormValues>();
  const type = useWatch({ control, name: "type" });
  const isSaleFlow = useSaleFlowType(type);
  const [activeTab, setActiveTab] = useState("gestion");
  const [scriptTabUnlocked, setScriptTabUnlocked] = useState(false);
  const {
    data: fetchedScript,
    isLoading: isScriptLoading,
    isError: isScriptError,
    refetch: refetchScript,
  } = useSalesScript(conversation.id);
  const script = savedScript ?? fetchedScript ?? null;
  const gestionSaved = hasSavedGestion || isSuccess;
  const showScriptTab = isSaleFlow && (scriptTabUnlocked || Boolean(script));

  useEffect(() => {
    setScriptTabUnlocked(false);
    setActiveTab("gestion");
  }, [conversation.id]);

  useEffect(() => {
    if (isSuccess && lastSaveAction === "script") {
      setScriptTabUnlocked(true);
      setActiveTab("script");
    }
  }, [isSuccess, lastSaveAction]);

  useEffect(() => {
    if (!showScriptTab && activeTab === "script") {
      setActiveTab("gestion");
    }
  }, [showScriptTab, activeTab]);

  useEffect(() => {
    if (!isSaleFlow && activeTab === "script") {
      setActiveTab("gestion");
    }
  }, [isSaleFlow, activeTab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[16px] font-semibold leading-[1.45] text-ink">Gestión del cliente</h2>
        {isSaleFlow ? (
          <Button type="submit" disabled={isSaving} onClick={onSaveSale}>
            {isSaving ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Plus className="size-[18px]" />
            )}
            Nueva venta
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-line px-4 pt-3">
          <TabsList className="h-auto w-full justify-start gap-0.5 bg-transparent p-0">
            <PanelTab value="gestion" icon={<ClipboardList className="size-4" />} label="Gestión" />
            {showScriptTab ? (
              <PanelTab value="script" icon={<ScrollText className="size-4" />} label="Script" />
            ) : null}
            <PanelTab value="oferta" icon={<Sparkles className="size-4" />} label="Motor de Oferta" />
            <PanelTab value="notas" icon={<MessageSquare className="size-4" />} label="Notas" />
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-3 lg:p-4 [&_input]:h-11 [&_input]:text-[14px] [&_textarea]:text-[14px]">
          <TabsContent value="gestion" className="space-y-5 outline-none">
            <SectionCard>
              <SectionCardHeader title="Información general" />
              <SectionCardBody className="space-y-4 pt-0">
                <ClientIdentityFields />
                <ClientPhoneField />
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <span className="text-[13px] font-medium text-muted">Estado</span>
                  <StatusBadge variant="in_progress">En gestión</StatusBadge>
                  {type ? <DynamicTipificationBadge slug={type} /> : null}
                </div>
                <LeadTypeSelect />
                {!isSaleFlow ? <FollowUpDateField /> : null}
              </SectionCardBody>
            </SectionCard>

            {isSaleFlow && <SaleDetails />}

            <SectionCard>
              <SectionCardHeader title="Notas de gestión" />
              <SectionCardBody className="pt-0">
                <ObservationField
                  name="observations"
                  label="Observaciones"
                  hint="(opcional)"
                  placeholder="Escribe aquí cualquier observación relevante sobre la gestión..."
                />
              </SectionCardBody>
            </SectionCard>

            {isError && (
              <div className="flex items-start gap-2.5 rounded-card border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
                <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                <span>{errorMessage || "No se pudo guardar la gestión. Intenta nuevamente."}</span>
              </div>
            )}
            {isSuccess && clientError ? (
              <div className="flex items-start gap-2.5 rounded-card border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
                <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                <span>{clientError}</span>
              </div>
            ) : null}
            {isSuccess && saleError ? (
              <div className="flex items-start gap-2.5 rounded-card border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
                <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                <span>{saleError}</span>
              </div>
            ) : null}
            {isSuccess && !clientError && (
              <div className="flex items-center gap-2.5 rounded-card border border-success/20 bg-success-soft px-4 py-3 text-[13px] text-success-ink">
                <CheckCircle2 className="size-[18px]" />
                {lastSaveAction === "close"
                  ? clientSaved
                    ? "Gestión guardada y cerrada. El cliente quedó tipificado."
                    : "Gestión guardada y cerrada correctamente."
                  : lastSaveAction === "tipify"
                  ? clientSaved
                    ? "Cliente tipificado correctamente. Ya aparece en Clientes."
                    : "Gestión guardada correctamente."
                  : lastSaveAction === "script" || lastSaveAction === "sale"
                  ? saleRegistered
                    ? script
                      ? "Venta guardada en Mis Ventas. El script de la llamada ya está disponible."
                      : "Venta guardada correctamente. Ya aparece en Mis Ventas."
                    : "Gestión guardada. No se pudo registrar la venta en Mis Ventas."
                  : saleRegistered
                    ? script
                      ? "Venta guardada en Mis Ventas. El script de la llamada ya está disponible."
                      : "Venta guardada correctamente. Ya aparece en Mis Ventas."
                    : script
                      ? "Gestión guardada. El script de la llamada ya está disponible."
                      : isSaleFlow
                        ? "Gestión guardada correctamente."
                        : clientSaved
                          ? "Cliente tipificado correctamente. Ya aparece en Clientes."
                          : "Gestión guardada correctamente."}
              </div>
            )}
            <ActionButtons
              isSaving={isSaving}
              onCancel={onCancel}
              mode={isSaleFlow ? "script" : "close"}
              onPrimaryAction={isSaleFlow ? onGenerateScript : onClose}
            />
          </TabsContent>

          {showScriptTab ? (
            <TabsContent value="script" className="outline-none">
              <SectionCard>
                <SectionCardBody>
                  <SalesScriptTab
                    script={script}
                    isLoading={isScriptLoading}
                    isError={isScriptError}
                    onRetry={() => refetchScript()}
                    gestionSaved={gestionSaved}
                    unavailableReason={script ? null : scriptUnavailableReason}
                  />
                </SectionCardBody>
              </SectionCard>
            </TabsContent>
          ) : null}

          <TabsContent value="oferta" className="outline-none">
            <OfferEngineTab conversationId={conversation.id} />
          </TabsContent>

          <TabsContent value="notas" className="outline-none">
            <SectionCard>
              <SectionCardHeader title="Notas internas" />
              <SectionCardBody className="pt-0">
                <ObservationField
                  name="internalNotes"
                  label="Notas internas"
                  hint="(solo para el equipo)"
                  placeholder="Comentarios internos que no ve el cliente..."
                />
              </SectionCardBody>
            </SectionCard>
          </TabsContent>

        </div>
      </Tabs>
    </div>
  );
}

function PanelTab({
  value,
  icon,
  label,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 pb-2.5 text-[12px] font-medium text-muted",
        "transition-colors duration-200 data-[state=active]:border-brand data-[state=active]:text-ink",
        "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

/** Reservado para reubicación futura (tab Historial removido del panel). */
function HistoryTab({ conversation }: { conversation: Conversation }) {
  const events = [
    {
      title: "Conversación iniciada",
      detail: "El cliente escribió por WhatsApp",
      time: conversation.lastMessageTime,
    },
    {
      title: "Mensaje recibido",
      detail: conversation.lastMessage,
      time: conversation.lastMessageTime,
    },
  ];
  return (
    <ol className="space-y-5">
      {events.map((e, i) => (
        <li key={i} className="relative flex gap-3.5">
          {i < events.length - 1 && (
            <span className="absolute left-[13px] top-7 h-full w-px bg-line" />
          )}
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <Clock className="size-3.5" />
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-medium text-ink">{e.title}</p>
            <p className="text-[13px] text-muted">{e.detail}</p>
            <p className="mt-0.5 text-[12px] text-muted">{e.time}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
