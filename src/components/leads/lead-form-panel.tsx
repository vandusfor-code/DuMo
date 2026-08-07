"use client";

import { useEffect, useRef } from "react";
import { LeadPanel } from "./lead-panel";
import { useSaveLead } from "@/hooks/use-leads";
import { useLatestGestionDraft } from "@/hooks/use-latest-gestion";
import type { Conversation } from "@/types/conversation";
import { type LeadFormValues } from "@/types/lead-form";
import type { SaveLeadInput } from "@/types/lead";
import type { SaveLeadAction } from "@/types/crm-client";
import {
  draftToFormValues,
  formatSaveLeadApiError,
  isCompleteSaleLine,
  mapSaleLineForSave,
} from "@/lib/lead-save";
import { useForm, FormProvider } from "react-hook-form";

/**
 * Owns the commercial-management form. Mounted with `key={conversation.id}` by
 * the page, so switching conversations gives a fresh form with no stale
 * field-array keys (avoids duplicated line cards).
 */
export function LeadFormPanel({ conversation }: { conversation: Conversation }) {
  const saveLead = useSaveLead(conversation.id);
  const gestionDraft = useLatestGestionDraft(conversation.id);
  const saveModeRef = useRef<SaveLeadAction>("script");
  const methods = useForm<LeadFormValues>({
    defaultValues: draftToFormValues({ conversation }),
  });

  useEffect(() => {
    if (gestionDraft.isLoading) return;
    methods.reset(draftToFormValues({ conversation, draft: gestionDraft.data }));
    // Solo al cambiar de conversación o cuando llega otra gestión guardada.
  }, [conversation.id, gestionDraft.data?.gestionId, gestionDraft.isLoading]);

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
    } catch (error) {
      methods.setError("root", { message: formatSaveLeadApiError(error) });
    }
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="flex h-full min-h-0 flex-col overflow-hidden">
        <LeadPanel
          conversation={conversation}
          isSaving={saveLead.isPending}
          isError={Boolean(methods.formState.errors.root) || saveLead.isError}
          errorMessage={methods.formState.errors.root?.message}
          isSuccess={saveLead.isSuccess}
          hasSavedGestion={saveLead.isSuccess || Boolean(gestionDraft.data?.gestionId)}
          savedScript={saveLead.data?.script ?? null}
          scriptUnavailableReason={saveLead.data?.scriptUnavailableReason ?? null}
          saleError={saveLead.data?.saleError ?? null}
          saleRegistered={Boolean(saveLead.data?.sale)}
          clientError={saveLead.data?.clientError ?? null}
          clientSaved={saveLead.data?.clientSaved ?? false}
          lastSaveAction={saveLead.data?.saveAction ?? null}
          onSaveSale={() => {
            saveModeRef.current = "sale";
          }}
          onGenerateScript={() => {
            saveModeRef.current = "script";
          }}
          onTipify={() => {
            saveModeRef.current = "tipify";
          }}
          onCancel={() =>
            methods.reset(draftToFormValues({ conversation, draft: gestionDraft.data }))
          }
        />
      </form>
    </FormProvider>
  );
}
