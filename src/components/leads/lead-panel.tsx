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
  Save,
  ScrollText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadTypeSelect } from "./lead-type-select";
import { SaleDetails } from "./sale-details";
import { ObservationField } from "./observation-field";
import { ActionButtons } from "./action-buttons";
import { ClientIdentityFields, ClientPhoneField } from "./client-card";
import { SalesScriptTab } from "./sales-script-tab";
import { useSalesScript } from "@/hooks/use-sales-script";
import {
  SectionCard,
  SectionCardBody,
  SectionCardHeader,
} from "@/components/leads/premium/section-card";
import { StatusBadge } from "@/components/leads/premium/status-badge";
import type { Conversation } from "@/types/conversation";
import type { LeadFormValues } from "@/types/lead-form";
import type { GeneratedSalesScript } from "@/types/sales-script";
import type { SaveLeadAction } from "@/types/crm-client";
import { cn } from "@/lib/utils";

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
  onSaveSale,
  onGenerateScript,
  onTipify,
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
  onTipify: () => void;
  savedScript?: GeneratedSalesScript | null;
  scriptUnavailableReason?: string | null;
  saleError?: string | null;
  saleRegistered?: boolean;
  lastSaveAction?: SaveLeadAction | null;
}) {
  const { control } = useFormContext<LeadFormValues>();
  const type = useWatch({ control, name: "type" });
  const isVenta = type === "venta";
  const [activeTab, setActiveTab] = useState("gestion");
  const {
    data: fetchedScript,
    isLoading: isScriptLoading,
    isError: isScriptError,
    refetch: refetchScript,
  } = useSalesScript(conversation.id);
  const script = savedScript ?? fetchedScript ?? null;
  const gestionSaved = hasSavedGestion || isSuccess;

  useEffect(() => {
    if (isSuccess && isVenta && lastSaveAction !== "tipify") {
      setActiveTab("script");
    }
  }, [isSuccess, isVenta, lastSaveAction]);

  useEffect(() => {
    if (!isVenta && activeTab === "script") {
      setActiveTab("gestion");
    }
  }, [isVenta, activeTab]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-[18px] font-semibold leading-[1.45] text-ink">Gestión del cliente</h2>
        {isVenta ? (
          <button
            type="submit"
            disabled={isSaving}
            onClick={onSaveSale}
            className="inline-flex h-10 items-center gap-2 rounded-btn bg-brand px-4 text-[13px] font-semibold text-white shadow-send transition-all duration-200 hover:scale-[1.02] hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Save className="size-[18px]" />
            )}
            Guardar venta
          </button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-line px-6 pt-4">
          <TabsList className="h-auto w-full justify-start gap-1 bg-transparent p-0">
            <PanelTab value="gestion" icon={<ClipboardList className="size-[18px]" />} label="Gestión" />
            {isVenta ? (
              <PanelTab value="script" icon={<ScrollText className="size-[18px]" />} label="Script" />
            ) : null}
            <PanelTab value="notas" icon={<MessageSquare className="size-[18px]" />} label="Notas" />
            <PanelTab value="historial" icon={<Clock className="size-[18px]" />} label="Historial" />
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 lg:p-5 [&_input]:h-11 [&_input]:text-[14px] [&_textarea]:text-[14px]">
          <TabsContent value="gestion" className="space-y-6 outline-none">
            <SectionCard>
              <SectionCardHeader title="Información general" />
              <SectionCardBody className="space-y-4 pt-0">
                <ClientIdentityFields />
                <ClientPhoneField />
                <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  <span className="text-[13px] font-medium text-muted">Estado</span>
                  <StatusBadge variant="in_progress">En gestión</StatusBadge>
                  {type === "venta" ? <StatusBadge variant="active">Venta</StatusBadge> : null}
                </div>
                <LeadTypeSelect />
              </SectionCardBody>
            </SectionCard>

            {type === "venta" && <SaleDetails />}

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
            {isSuccess && saleError ? (
              <div className="flex items-start gap-2.5 rounded-card border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
                <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                <span>{saleError}</span>
              </div>
            ) : null}
            {isSuccess && (
              <div className="flex items-center gap-2.5 rounded-card border border-success/20 bg-success-soft px-4 py-3 text-[13px] text-success-ink">
                <CheckCircle2 className="size-[18px]" />
                {lastSaveAction === "tipify"
                  ? "Cliente tipificado correctamente. Ya aparece en Clientes."
                  : saleRegistered
                    ? script
                      ? "Venta guardada en Mis Ventas. El script de la llamada ya está disponible."
                      : "Venta guardada correctamente. Ya aparece en Mis Ventas."
                    : script
                      ? "Gestión guardada. El script de la llamada ya está disponible."
                      : isVenta
                        ? "Gestión guardada correctamente."
                        : "Cliente tipificado correctamente. Ya aparece en Clientes."}
              </div>
            )}
            <ActionButtons
              isSaving={isSaving}
              onCancel={onCancel}
              mode={isVenta ? "script" : "tipify"}
              onPrimaryAction={isVenta ? onGenerateScript : onTipify}
            />
          </TabsContent>

          {isVenta ? (
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

          <TabsContent value="historial" className="outline-none">
            <SectionCard>
              <SectionCardHeader title="Historial" />
              <SectionCardBody className="pt-0">
                <HistoryTab conversation={conversation} />
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
        "gap-2 rounded-none border-b-2 border-transparent bg-transparent px-3 pb-3 text-[13px] font-medium text-muted",
        "transition-colors duration-200 data-[state=active]:border-brand data-[state=active]:text-ink",
        "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

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
