"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageSquare,
  Plus,
  ScrollText,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadTypeSelect } from "./lead-type-select";
import { SaleDetails } from "./sale-details";
import { ObservationField } from "./observation-field";
import { ActionButtons } from "./action-buttons";
import { ClientCard } from "./client-card";
import { SalesScriptTab } from "./sales-script-tab";
import { useSalesScript } from "@/hooks/use-sales-script";
import type { Conversation } from "@/types/conversation";
import type { LeadFormValues } from "@/types/lead-form";
import type { GeneratedSalesScript } from "@/types/sales-script";

export function LeadPanel({
  conversation,
  isSaving,
  isError,
  isSuccess,
  onCancel,
  savedScript,
}: {
  conversation: Conversation;
  isSaving: boolean;
  isError: boolean;
  isSuccess: boolean;
  onCancel: () => void;
  savedScript?: GeneratedSalesScript | null;
}) {
  const { control } = useFormContext<LeadFormValues>();
  const type = useWatch({ control, name: "type" });
  const [activeTab, setActiveTab] = useState("gestion");
  const { data: fetchedScript } = useSalesScript(conversation.id);
  const script = savedScript ?? fetchedScript ?? null;

  useEffect(() => {
    if (isSuccess && script) {
      setActiveTab("script");
    }
  }, [isSuccess, script]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="text-[15px] font-semibold text-ink">Gestión del cliente</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand-soft"
        >
          <Plus className="size-4" />
          Nueva conversación
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-line px-4 pt-3">
          <TabsList className="w-full justify-start bg-transparent p-0">
            <PanelTab value="gestion" icon={<ClipboardList className="size-4" />} label="Gestión" />
            <PanelTab value="cliente" icon={<User className="size-4" />} label="Cliente" />
            <PanelTab value="script" icon={<ScrollText className="size-4" />} label="Script" />
            <PanelTab value="notas" icon={<MessageSquare className="size-4" />} label="Notas" />
            <PanelTab value="historial" icon={<Clock className="size-4" />} label="Historial" />
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <TabsContent value="gestion" className="space-y-5 outline-none">
            <LeadTypeSelect />
            {type === "venta" && <SaleDetails />}
            <ObservationField
              name="observations"
              label="Observaciones"
              hint="(opcional)"
              placeholder="Escribe aquí cualquier observación relevante sobre la gestión..."
            />
            {isError && (
              <div className="flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
                <AlertCircle className="size-[18px]" />
                No se pudo guardar la gestión. Intenta nuevamente.
              </div>
            )}
            {isSuccess && (
              <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[13px] text-success-ink">
                <CheckCircle2 className="size-[18px]" />
                Gestión guardada correctamente. El script de venta ya está disponible.
              </div>
            )}
            <ActionButtons isSaving={isSaving} onCancel={onCancel} />
          </TabsContent>

          <TabsContent value="cliente" className="outline-none">
            <ClientCard />
          </TabsContent>

          <TabsContent value="script" className="outline-none">
            <SalesScriptTab script={script} />
          </TabsContent>

          <TabsContent value="notas" className="outline-none">
            <ObservationField
              name="internalNotes"
              label="Notas internas"
              hint="(solo para el equipo)"
              placeholder="Comentarios internos que no ve el cliente..."
            />
          </TabsContent>

          <TabsContent value="historial" className="outline-none">
            <HistoryTab conversation={conversation} />
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
      className="flex-1 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent px-2 pb-2.5 text-[13px] data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:shadow-none"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

function HistoryTab({ conversation }: { conversation: Conversation }) {
  const events = [
    { title: "Conversación iniciada", detail: "El cliente escribió por WhatsApp", time: conversation.lastMessageTime },
    { title: "Mensaje recibido", detail: conversation.lastMessage, time: conversation.lastMessageTime },
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
