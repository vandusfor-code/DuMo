"use client";

import { useMemo, useState } from "react";
import { ChevronDown, MoreVertical, Sparkles } from "lucide-react";
import { useAdvisorQuickReplies } from "@/hooks/use-quick-replies";
import { useTemplateSend } from "@/components/messaging/template-picker";
import { AllTemplatesPanel } from "@/components/leads/premium/all-templates-panel";
import { QuickReplyChip } from "@/components/leads/premium/quick-reply-chip";
import {
  getPinnedShortcutVisual,
  MAX_PINNED_QUICK_REPLIES,
} from "@/lib/pinned-quick-replies";
import { cn } from "@/lib/utils";

/** Selector de plantillas + atajos fijados arriba del composer (chat premium). */
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
  const { data: templates = [], isLoading, isError } = useAdvisorQuickReplies();
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

  const closePanel = () => setPanelOpen(false);
  const togglePanel = () => setPanelOpen((v) => !v);

  if (isLoading) {
    return (
      <div className="mb-3">
        <span className="text-[13px] font-semibold text-ink">Plantilla</span>
        <p className="mt-2 text-[12px] text-muted">Cargando plantillas…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mb-3">
        <span className="text-[13px] font-semibold text-ink">Plantilla</span>
        <p className="mt-2 text-[12px] text-danger-ink">No se pudieron cargar las plantillas.</p>
      </div>
    );
  }

  if (templates.length === 0) return null;

  return (
    <div className="relative z-20 mb-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink">Plantilla</span>
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

      <div className="flex items-stretch gap-2">
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={disabled || templateSend.isSending}
            aria-expanded={panelOpen}
            aria-haspopup="listbox"
            onClick={togglePanel}
            className={cn(
              "flex h-10 items-center gap-2 rounded-full border border-brand bg-white px-3",
              "text-[12px] font-medium text-brand transition-colors sm:text-[13px]",
              "hover:bg-brand-soft/20 disabled:cursor-not-allowed disabled:opacity-60",
              panelOpen && "bg-brand-soft/30",
            )}
          >
            <Sparkles className="size-4 shrink-0" strokeWidth={2} />
            <span className="whitespace-nowrap">Seleccionar plantilla</span>
            <ChevronDown
              className={cn("size-4 shrink-0 transition-transform", panelOpen && "rotate-180")}
            />
          </button>

          <AllTemplatesPanel
            open={panelOpen}
            onClose={closePanel}
            templates={templates}
            onSelect={(t) => void templateSend.handleSelect(t)}
            allowPin={variant === "admin"}
            disabled={disabled}
            isSending={templateSend.isSending}
            placement="dropdown"
          />
        </div>

        <div className="flex min-w-0 flex-1 items-stretch gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {pinned.map((t, index) => (
            <QuickReplyChip
              key={t.id}
              label={t.name}
              compact
              visual={getPinnedShortcutVisual({
                categorySlug: t.categorySlug,
                name: t.name,
                index,
              })}
              disabled={disabled || templateSend.isSending || panelOpen}
              onClick={() => void templateSend.handleSelect(t)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
