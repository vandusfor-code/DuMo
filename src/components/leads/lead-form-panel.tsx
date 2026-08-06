"use client";

import { LeadPanel } from "./lead-panel";
import { useSaveLead } from "@/hooks/use-leads";
import type { Conversation } from "@/types/conversation";
import { EMPTY_LEAD_LINE, type LeadFormValues } from "@/types/lead-form";
import type { SaveLeadInput } from "@/types/lead";
import {
  formatSaveLeadApiError,
  isCompleteSaleLine,
  mapSaleLineForSave,
} from "@/lib/lead-save";
import { useForm, FormProvider } from "react-hook-form";

function defaultsFor(c: Conversation): LeadFormValues {
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

/**
 * Owns the commercial-management form. Mounted with `key={conversation.id}` by
 * the page, so switching conversations gives a fresh form with no stale
 * field-array keys (avoids duplicated line cards).
 */
export function LeadFormPanel({ conversation }: { conversation: Conversation }) {
  const saveLead = useSaveLead(conversation.id);
  const methods = useForm<LeadFormValues>({
    defaultValues: defaultsFor(conversation),
  });

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
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <LeadPanel
          conversation={conversation}
          isSaving={saveLead.isPending}
          isError={Boolean(methods.formState.errors.root) || saveLead.isError}
          errorMessage={methods.formState.errors.root?.message}
          isSuccess={saveLead.isSuccess}
          savedScript={saveLead.data?.script ?? null}
          scriptUnavailableReason={saveLead.data?.scriptUnavailableReason ?? null}
          onCancel={() => methods.reset(defaultsFor(conversation))}
        />
      </form>
    </FormProvider>
  );
}
