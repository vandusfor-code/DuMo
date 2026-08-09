"use client";

import { useMemo } from "react";
import { ChevronRight, Loader2, Pin, Star } from "lucide-react";
import { getCategoryVisual } from "@/lib/plantillas-category-icons";
import {
  MAX_PINNED_QUICK_REPLIES,
  PINNED_LIMIT_MESSAGE,
} from "@/lib/pinned-quick-replies.constants";
import { useToggleQuickReplyPin } from "@/hooks/use-quick-replies";
import type { AdvisorQuickReplyTemplate } from "@/types/quick-reply";
import { cn } from "@/lib/utils";

export function AllTemplatesPanel({
  open,
  onClose,
  templates,
  onSelect,
  allowPin,
  disabled,
  isSending,
}: {
  open: boolean;
  onClose: () => void;
  templates: AdvisorQuickReplyTemplate[];
  onSelect: (template: AdvisorQuickReplyTemplate) => void;
  allowPin?: boolean;
  disabled?: boolean;
  isSending?: boolean;
}) {
  const togglePin = useToggleQuickReplyPin();

  const sorted = useMemo(() => {
    return [...templates].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
    });
  }, [templates]);

  const pinnedCount = useMemo(
    () => templates.filter((t) => t.favorite).length,
    [templates],
  );

  if (!open) return null;

  const handlePin = (template: AdvisorQuickReplyTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglePin.isPending) return;
    if (!template.favorite && pinnedCount >= MAX_PINNED_QUICK_REPLIES) {
      window.alert(PINNED_LIMIT_MESSAGE);
      return;
    }
    togglePin.mutate(
      { id: template.id, favorite: !template.favorite },
      {
        onError: (err) => {
          window.alert(err instanceof Error ? err.message : PINNED_LIMIT_MESSAGE);
        },
      },
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar listado de plantillas"
        className="fixed inset-0 z-30 cursor-default bg-black/10"
        onClick={onClose}
      />
      <div
        role="listbox"
        aria-label="Todas las plantillas"
        className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-[#E8E8E8] bg-white py-1 shadow-lg"
      >
        {sorted.length === 0 ? (
          <p className="px-4 py-3 text-[13px] text-muted">No hay plantillas disponibles.</p>
        ) : (
          sorted.map((template, index) => {
            const visual = getCategoryVisual(template.categorySlug, template.categoryName);
            const Icon = visual.icon;
            const rowDisabled = disabled || isSending;

            return (
              <div
                key={template.id}
                role="option"
                className={cn(
                  "flex items-center gap-2 border-b border-[#F0F0F0] px-3 py-2.5 last:border-0",
                  rowDisabled ? "opacity-60" : "hover:bg-[#FAFAFA]",
                )}
              >
                <button
                  type="button"
                  disabled={rowDisabled}
                  onClick={() => {
                    if (rowDisabled) return;
                    onSelect(template);
                    onClose();
                  }}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-full",
                      visual.bgClass,
                    )}
                  >
                    <Icon className={cn("size-4", visual.iconClass)} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {index + 1}. {template.name}
                    </span>
                    {template.categoryName ? (
                      <span className="block truncate text-[11px] text-muted">
                        {template.categoryName}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" />
                </button>
                {allowPin ? (
                  <button
                    type="button"
                    aria-label={template.favorite ? "Quitar de atajos fijados" : "Fijar en atajos"}
                    disabled={togglePin.isPending}
                    onClick={(e) => handlePin(template, e)}
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-lg transition-colors",
                      template.favorite
                        ? "text-brand hover:bg-brand-soft"
                        : "text-muted hover:bg-black/5 hover:text-ink",
                    )}
                  >
                    {togglePin.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : template.favorite ? (
                      <Star className="size-4 fill-brand text-brand" />
                    ) : (
                      <Pin className="size-4" />
                    )}
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
