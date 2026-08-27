"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/api-client";
import { leadKeys } from "@/hooks/use-leads";

export interface SendManualMessageInput {
  phone: string;
  name?: string;
  text: string;
}

export interface SendManualMessageResult {
  ok: true;
  conversationId: string;
  messageId: string;
}

/** "Nueva conversación" — la asesora escribe primero (cliente le pidió el número por teléfono). */
export function useSendManualMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendManualMessageInput) =>
      apiPost<SendManualMessageResult>("/api/leads/manual-message", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: leadKeys.conversations });
      qc.invalidateQueries({ queryKey: ["admin", "leads", "conversations"] });
    },
  });
}
