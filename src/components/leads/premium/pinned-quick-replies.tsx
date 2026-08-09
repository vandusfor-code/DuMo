"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MoreVertical, Pin } from "lucide-react";
import { useAdvisorQuickReplies } from "@/hooks/use-quick-replies";
import { useTemplateSend } from "@/components/messaging/template-picker";
import { AllTemplatesPanel } from "@/components/leads/premium/all-templates-panel";
import { QuickReplyChip } from "@/components/leads/premium/quick-reply-chip";
import {
  getPinnedShortcutVisual,
  PINNED_QUICK_REPLIES_VISIBLE_IN_CHAT,
} from "@/lib/pinned-quick-replies";
import { cn } from "@/lib/utils";

/** Barra de atajos fijados arriba del composer (asesor + admin premium). */
export function PinnedQuickReplies({
  conversationId,
  to,
  customerName,
  variant = "advisor",
  disabled,
  onInsertText,
  onSent,
}: {
  conversationId: string;
  to: string;
  customerName?: string;
  variant?: "advisor" | "admin";
  disabled?: boolean;
  onInsertText: (text: string) => void;
  onSent?: () => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
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
        .slice(0, PINNED_QUICK_REPLIES_VISIBLE_IN_CHAT),
    [templates],
  );

  const openPanel = () => setPanelOpen(true);
  const closePanel = () => setPanelOpen(false);
  const togglePanel = () => setPanelOpen((v) => !v);

  if (templates.length === 0) return null;

  return (
    <div className="relative mb-3 rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Pin className="size-4 shrink-0 text-ink" strokeWidth={2} />
          <span className="truncate text-[13px] font-semibold text-ink">Atajos fijados</span>
        </div>
        <button
          type="button"
          aria-label="Ver todas las plantillas"
          aria-expanded={panelOpen}
          onClick={togglePanel}
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-black/5 hover:text-ink",
            panelOpen && "bg-black/5 text-ink",
          )}
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
            disabled={disabled || templateSend.isSending || panelOpen}
            onClick={() => void templateSend.handleSelect(t)}
          />
        ))}
        <button
          type="button"
          disabled={disabled || templateSend.isSending}
          aria-expanded={panelOpen}
          onClick={openPanel}
          className={cn(
            "flex min-h-[52px] shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 bg-white px-3 py-2",
            "text-[11px] font-medium text-brand transition-colors sm:text-[12px]",
            "hover:bg-brand-soft/30 disabled:cursor-not-allowed disabled:opacity-60",
            panelOpen && "border-brand bg-brand-soft/20",
          )}
        >
          <span className="whitespace-nowrap">Ver más plantillas</span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", panelOpen && "rotate-180")}
          />
        </button>
      </div>

      <AllTemplatesPanel
        open={panelOpen}
        onClose={closePanel}
        templates={templates}
        onSelect={(t) => void templateSend.handleSelect(t)}
        allowPin={variant === "admin"}
        disabled={disabled}
        isSending={templateSend.isSending}
      />
    </div>
  );
}
