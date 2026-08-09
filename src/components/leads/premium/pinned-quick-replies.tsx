"use client";

import { useMemo } from "react";
import { MoreVertical, Pin } from "lucide-react";
import { useAdvisorQuickReplies } from "@/hooks/use-quick-replies";
import { useTemplateSend } from "@/components/messaging/template-picker";
import { QuickReplyChip } from "@/components/leads/premium/quick-reply-chip";
import {
  getPinnedShortcutVisual,
  MAX_PINNED_QUICK_REPLIES,
} from "@/lib/pinned-quick-replies";

/** Barra de atajos fijados arriba del composer (asesor + admin premium). */
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
    () =>
      templates
        .filter((t) => t.favorite)
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .slice(0, MAX_PINNED_QUICK_REPLIES),
    [templates],
  );

  if (pinned.length === 0) return null;

  return (
    <div className="mb-3 rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Pin className="size-4 shrink-0 text-ink" strokeWidth={2} />
          <span className="truncate text-[13px] font-semibold text-ink">
            Atajos fijados ({pinned.length}/{MAX_PINNED_QUICK_REPLIES})
          </span>
        </div>
        <button
          type="button"
          aria-label="Opciones de atajos"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-ink"
        >
          <MoreVertical className="size-4" />
        </button>
      </div>
      <div className="flex gap-2">
        {pinned.map((t, index) => (
          <QuickReplyChip
            key={t.id}
            label={t.name}
            visual={getPinnedShortcutVisual({
              categorySlug: t.categorySlug,
              name: t.name,
              index,
            })}
            disabled={disabled || templateSend.isSending}
            onClick={() => void templateSend.handleSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}
