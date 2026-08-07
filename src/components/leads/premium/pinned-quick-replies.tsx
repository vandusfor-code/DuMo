"use client";

import { useMemo } from "react";
import { useAdvisorQuickReplies } from "@/hooks/use-quick-replies";
import { useTemplateSend } from "@/components/messaging/template-picker";
import { QuickReplyChip } from "@/components/leads/premium/quick-reply-chip";

/** Plantillas fijadas (pin) que aparecen arriba del composer en Leads. */
export function PinnedQuickReplies({
  conversationId,
  to,
  customerName,
  disabled,
  onInsertText,
  onSent,
}: {
  conversationId: string;
  to: string;
  customerName?: string;
  disabled?: boolean;
  onInsertText: (text: string) => void;
  onSent?: () => void;
}) {
  const { data: templates = [] } = useAdvisorQuickReplies();
  const templateSend = useTemplateSend({
    conversationId,
    to,
    customerName,
    onInsertText,
    onSent,
  });

  const pinned = useMemo(
    () => templates.filter((t) => t.favorite).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [templates],
  );

  if (pinned.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {pinned.map((t) => (
        <QuickReplyChip
          key={t.id}
          label={t.name}
          disabled={disabled || templateSend.isSending}
          onClick={() => void templateSend.handleSelect(t)}
        />
      ))}
    </div>
  );
}
