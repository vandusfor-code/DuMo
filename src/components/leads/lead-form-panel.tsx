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
import { validateLeadFormBeforeSave } from "@/lib/lead-form-validation";
import { DUO_TIPIFICATION_SLUG } from "@/types/duo-sale";
import { useTipificationCatalog } from "@/hooks/use-tipification-catalog";
import {
  clearPendingTipificationLabel,
  commitTipificationLabel,
} from "@/hooks/use-pending-tipification-label";
import { useForm, FormProvider } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Owns the commercial-management form. Mounted with `key={conversation.id}` by
 * the page, so switching conversations gives a fresh form with no stale
 * field-array keys (avoids duplicated line cards).
 */
export function LeadFormPanel({
  conversation,
  onInboxClosed,
}: {
  conversation: Conversation;
  onInboxClosed?: () => void;
}) {
  const saveLead = useSaveLead(conversation.id);
  const gestionDraft = useLatestGestionDraft(conversation.id);
  const saveModeRef = useRef<SaveLeadAction>("close");
  const { triggersSaleFlow, opensCustomForm, catalog } = useTipificationCatalog();
  const queryClient = useQueryClient();
  const methods = useForm<LeadFormValues>({
    defaultValues: draftToFormValues({ conversation }),
  });

  useEffect(() => {
    if (gestionDraft.isLoading) return;
    methods.reset(draftToFormValues({ conversation, draft: gestionDraft.data }));
    // Solo al cambiar de conversación o cuando llega otra gestión guardada.
  }, [conversation.id, gestionDraft.data?.gestionId, gestionDraft.isLoading]);

  const onSubmit = methods.handleSubmit(async (values) => {
    const validation = validateLeadFormBeforeSave({
      values,
      saveAction: saveModeRef.current,
      catalog,
      triggersSaleFlow,
      opensCustomForm,
      isCompleteSaleLine,
    });

    if (!validation.ok) {
      if (validation.field) {
        methods.setError(validation.field, { message: validation.message });
      } else {
        methods.setError("root", { message: validation.message });
      }
      return;
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
      carrier: values.carrier,
      type: values.type,
      notes: notesParts.join("\n\n"),
      lines:
        triggersSaleFlow(values.type)
          ? values.lines.filter(isCompleteSaleLine).map(mapSaleLineForSave)
          : [],
      registerSale: saveModeRef.current === "sale",
      saveAction: saveModeRef.current,
      followUpDate: validation.followUpDate,
      duoSale: values.type === DUO_TIPIFICATION_SLUG ? values.duo : undefined,
      folioNumber: values.folioNumber,
    };
    try {
      const result = await saveLead.mutateAsync(input);
      commitTipificationLabel(queryClient, conversation.id, values.type, catalog);
      methods.clearErrors("root");
      methods.clearErrors("followUpDate");
      if (result.inboxClosed) {
        onInboxClosed?.();
      }
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
          duoSaleError={saveLead.data?.duoSaleError ?? null}
          lastSaveAction={saveLead.data?.saveAction ?? null}
          inboxClosed={saveLead.data?.inboxClosed ?? false}
          onSaveSale={() => {
            saveModeRef.current = "sale";
          }}
          onGenerateScript={() => {
            saveModeRef.current = "script";
          }}
          onClose={() => {
            saveModeRef.current = "close";
          }}
          onCancel={() => {
            clearPendingTipificationLabel(queryClient, conversation.id);
            methods.reset(draftToFormValues({ conversation, draft: gestionDraft.data }));
          }}
        />
      </form>
    </FormProvider>
  );
}
