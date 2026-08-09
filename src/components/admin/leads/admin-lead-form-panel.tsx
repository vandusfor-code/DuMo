"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  ScrollText,
  Sparkles,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LeadTypeSelect } from "@/components/leads/lead-type-select";
import { SaleDetails } from "@/components/leads/sale-details";
import { ObservationField } from "@/components/leads/observation-field";
import { ActionButtons } from "@/components/leads/action-buttons";
import { ClientCard } from "@/components/leads/client-card";
import { SalesScriptTab } from "@/components/leads/sales-script-tab";
import { OfferEngineTab } from "@/components/leads/offer-engine/offer-engine-tab";
import { useSalesScript } from "@/hooks/use-sales-script";
import {
  useAddLeadNote,
  useDeleteLeadNote,
  useSaveAdminLead,
  useUpdateLeadNote,
} from "@/hooks/use-admin-leads";
import type { AdminConversation, ClientProfile, LeadNote, LeadTimelineEvent } from "@/types/admin-lead";
import { EMPTY_LEAD_LINE, type LeadFormValues } from "@/types/lead-form";
import type { SaveLeadAction } from "@/types/crm-client";
import type { SaveLeadInput } from "@/types/lead";
import {
  formatSaveLeadApiError,
  isCompleteSaleLine,
  mapSaleLineForSave,
} from "@/lib/lead-save";
import { useWatch } from "react-hook-form";

function defaultsFor(c: AdminConversation): LeadFormValues {
  return {
    customerName: c.customerName,
    rut: c.rut,
    phone: c.phone,
    type: "venta",
    observations: "",
    internalNotes: "",
    lines: [{ ...EMPTY_LEAD_LINE }],
  };
}

export function AdminLeadFormPanel({
  conversation,
  client,
  notes,
  timeline: _timeline,
}: {
  conversation: AdminConversation;
  client: ClientProfile;
  notes: LeadNote[];
  timeline: LeadTimelineEvent[];
}) {
  void _timeline;
  const saveLead = useSaveAdminLead(conversation.id);
  const saveModeRef = useRef<SaveLeadAction>("script");
  const [activeTab, setActiveTab] = useState("gestion");
  const [scriptTabUnlocked, setScriptTabUnlocked] = useState(false);
  const { data: fetchedScript } = useSalesScript(conversation.id);
  const script = saveLead.data?.script ?? fetchedScript ?? null;
  const methods = useForm<LeadFormValues>({ defaultValues: defaultsFor(conversation) });
  const type = useWatch({ control: methods.control, name: "type" });
  const isVenta = type === "venta";
  const showScriptTab = isVenta && (scriptTabUnlocked || Boolean(script));

  useEffect(() => {
    setScriptTabUnlocked(false);
    setActiveTab("gestion");
  }, [conversation.id]);

  useEffect(() => {
    if (!showScriptTab && activeTab === "script") {
      setActiveTab("gestion");
    }
  }, [showScriptTab, activeTab]);

  useEffect(() => {
    if (!isVenta && activeTab === "script") {
      setActiveTab("gestion");
    }
  }, [isVenta, activeTab]);

  const onSubmit = methods.handleSubmit(async (values) => {
    if (values.type === "venta") {
      const completeLines = values.lines.filter(isCompleteSaleLine);
      if (completeLines.length === 0) {
        methods.setError("root", {
          message:
            "Completa al menos una línea con número, tipo de venta, plan, región y comuna.",
        });
        return;
      }
    }

    const notesParts = [
      values.observations,
      values.internalNotes ? `Notas internas: ${values.internalNotes}` : "",
    ].filter(Boolean);

    const input: SaveLeadInput = {
      conversationId: conversation.id,
      phone: values.phone,
      customerName: values.customerName,
      rut: values.rut,
      type: values.type,
      notes: notesParts.join("\n\n"),
      lines:
        values.type === "venta"
          ? values.lines.filter(isCompleteSaleLine).map(mapSaleLineForSave)
          : [],
      registerSale: saveModeRef.current === "sale",
      saveAction: saveModeRef.current,
    };
    try {
      await saveLead.mutateAsync(input);
      methods.clearErrors("root");
      const action = saveModeRef.current;
      if (action === "script") {
        setScriptTabUnlocked(true);
        setActiveTab("script");
      }
    } catch (error) {
      methods.setError("root", { message: formatSaveLeadApiError(error) });
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[14px] font-semibold text-ink">Gestión del cliente</p>
            {type === "venta" ? (
              <button
                type="submit"
                disabled={saveLead.isPending}
                onClick={() => {
                  saveModeRef.current = "sale";
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-[13px] font-medium text-brand transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLead.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Nueva venta
              </button>
            ) : null}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-line px-3 pt-2.5">
              <TabsList className="w-full justify-start gap-0.5 bg-transparent p-0">
                <PanelTab value="gestion" icon={<ClipboardList className="size-4" />} label="Gestión" />
                <PanelTab value="cliente" icon={<User className="size-4" />} label="Cliente" />
                {showScriptTab ? (
                  <PanelTab value="script" icon={<ScrollText className="size-4" />} label="Script" />
                ) : null}
                <PanelTab value="oferta" icon={<Sparkles className="size-4" />} label="Motor de Oferta" />
                <PanelTab value="notas" icon={<MessageSquare className="size-4" />} label="Notas" />
              </TabsList>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 lg:p-4">
              <TabsContent value="gestion" className="space-y-4 outline-none">
                <ClientCard />
                <LeadTypeSelect />
                {type === "venta" && <SaleDetails />}
                <ObservationField
                  name="observations"
                  label="Observaciones"
                  hint="(opcional)"
                  placeholder="Escribe aquí cualquier observación relevante sobre la gestión..."
                />
                {(Boolean(methods.formState.errors.root) || saveLead.isError) && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
                    <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                    <span>
                      {methods.formState.errors.root?.message ||
                        "No se pudo guardar la gestión. Intenta nuevamente."}
                    </span>
                  </div>
                )}
                {saveLead.isSuccess && (
                  <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success-soft px-4 py-3 text-[13px] text-success-ink">
                    <CheckCircle2 className="size-[18px]" />
                    {saveLead.data?.sale
                      ? script
                        ? "Venta guardada correctamente. Ya aparece en Ventas y el script está disponible."
                        : "Venta guardada correctamente. Ya aparece en Ventas."
                      : script
                        ? "Gestión guardada correctamente. El script de venta ya está disponible."
                        : "Gestión guardada correctamente."}
                  </div>
                )}
                {saveLead.isSuccess && saveLead.data?.saleError ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-[13px] text-warning-ink">
                    <AlertCircle className="mt-0.5 size-[18px] shrink-0" />
                    <span>{saveLead.data.saleError}</span>
                  </div>
                ) : null}
                <ActionButtons
                  isSaving={saveLead.isPending}
                  onCancel={() => methods.reset(defaultsFor(conversation))}
                  mode={type === "venta" ? "script" : "tipify"}
                  onPrimaryAction={() => {
                    saveModeRef.current = type === "venta" ? "script" : "tipify";
                  }}
                />
              </TabsContent>

              <TabsContent value="cliente" className="outline-none">
                <ClientHistoryCard client={client} />
              </TabsContent>

              {showScriptTab ? (
                <TabsContent value="script" className="outline-none">
                  <SalesScriptTab
                    script={script}
                    gestionSaved={saveLead.isSuccess}
                    unavailableReason={script ? null : saveLead.data?.scriptUnavailableReason}
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="oferta" className="outline-none">
                <OfferEngineTab conversationId={conversation.id} />
              </TabsContent>

              <TabsContent value="notas" className="outline-none">
                <NotesTab conversationId={conversation.id} notes={notes} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </form>
    </FormProvider>
  );
}

function PanelTab({ value, icon, label }: { value: string; icon: React.ReactNode; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="flex-1 gap-1 rounded-none border-b-2 border-transparent bg-transparent px-1.5 pb-2 text-[12px] data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:shadow-none"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

function ClientHistoryCard({ client }: { client: ClientProfile }) {
  const rows = [
    { label: "Ventas realizadas", value: String(client.salesCount) },
    { label: "Líneas activas", value: String(client.linesCount) },
    { label: "Primer contacto", value: client.firstContact },
    { label: "Última compra", value: client.lastPurchase ?? "—" },
    { label: "Estado actual", value: client.currentStatus },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
          <span className="text-[13px] text-muted">{r.label}</span>
          <span className="text-[14px] font-semibold text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ conversationId, notes }: { conversationId: string; notes: LeadNote[] }) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const addNote = useAddLeadNote();
  const updateNote = useUpdateLeadNote();
  const deleteNote = useDeleteLeadNote();

  const submit = async () => {
    if (!text.trim()) return;
    await addNote.mutateAsync({ conversationId, text: text.trim(), author: "Administrador" });
    setText("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agregar nota interna..."
          className="min-h-[80px] w-full rounded-xl border border-line bg-card px-4 py-3 text-[14px] outline-none focus:border-brand/40"
        />
        <Button type="button" size="sm" onClick={submit} disabled={addNote.isPending || !text.trim()}>
          Agregar nota
        </Button>
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-line p-4">
            {editingId === n.id ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[60px] w-full rounded-lg border border-line px-3 py-2 text-[14px]"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      await updateNote.mutateAsync({ id: n.id, text: editText });
                      setEditingId(null);
                    }}
                  >
                    Guardar
                  </Button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-[14px] text-ink">{n.text}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[12px] text-muted">
                    {n.author} · {new Date(n.createdAt).toLocaleString("es-CL")}
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Editar"
                      onClick={() => {
                        setEditingId(n.id);
                        setEditText(n.text);
                      }}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-brand"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar"
                      onClick={() => deleteNote.mutate(n.id)}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger-ink"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Reservado para reubicación futura (tab Historial removido del panel). */
function TimelineTab({ events }: { events: LeadTimelineEvent[] }) {
  return (
    <ol className="space-y-5">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3.5">
          {i < events.length - 1 && (
            <span className="absolute left-[13px] top-7 h-full w-px bg-line" />
          )}
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
            <Clock className="size-3.5" />
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-medium text-ink">{e.title}</p>
            <p className="text-[13px] text-muted">{e.detail}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {e.at} {e.user ? `· ${e.user}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
