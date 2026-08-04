"use client";

import { useForm, FormProvider } from "react-hook-form";
import { LeadPanel } from "./lead-panel";
import { useSaveLead } from "@/hooks/use-leads";
import type { Conversation } from "@/types/conversation";
import { EMPTY_LEAD_LINE, type LeadFormValues } from "@/types/lead-form";
import type { LeadSaleType, SaveLeadInput } from "@/types/lead";

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
  const saveLead = useSaveLead();
  const methods = useForm<LeadFormValues>({
    defaultValues: defaultsFor(conversation),
  });

  const onSubmit = methods.handleSubmit(async (values) => {
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
          ? values.lines
              .filter((l) => l.phone || l.saleType || l.planId)
              .map((l) => ({
                phone: l.phone,
                saleType: l.saleType as LeadSaleType,
                planId: l.planId,
                equipment: l.equipment,
              }))
          : [],
    };
    await saveLead.mutateAsync(input);
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={onSubmit} className="flex h-full flex-col">
        <LeadPanel
          conversation={conversation}
          isSaving={saveLead.isPending}
          isError={saveLead.isError}
          isSuccess={saveLead.isSuccess}
          onCancel={() => methods.reset(defaultsFor(conversation))}
        />
      </form>
    </FormProvider>
  );
}
