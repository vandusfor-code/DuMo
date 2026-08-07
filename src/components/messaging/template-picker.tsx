"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { useAdvisorQuickReplies, useSendQuickReplyTemplate } from "@/hooks/use-quick-replies";
import type { AdvisorQuickReplyTemplate } from "@/types/quick-reply";
import { cn } from "@/lib/utils";

export function TemplatePicker({
  open,
  query,
  onSelect,
  onClose,
}: {
  open: boolean;
  query: string;
  onSelect: (template: AdvisorQuickReplyTemplate) => void;
  onClose: () => void;
}) {
  const { data: templates = [], isLoading } = useAdvisorQuickReplies();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...templates];
    if (q) {
      list = list.filter((t) => {
        const haystack = [t.name, t.shortcut, t.categoryName, ...t.tags].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
    list.sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return a.name.localeCompare(b.name, "es");
    });
    return list;
  }, [templates, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIndex]) {
        e.preventDefault();
        onSelect(filtered[activeIndex]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, activeIndex, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-64 overflow-y-auto rounded-2xl border border-line bg-card shadow-lg"
    >
      {isLoading ? (
        <p className="p-4 text-[13px] text-muted">Cargando plantillas…</p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-[13px] text-muted">Sin resultados</p>
      ) : (
        filtered.map((t, index) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className={cn(
              "flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-left last:border-0",
              index === activeIndex && "bg-brand-soft/60",
            )}
          >
            {t.favorite ? <Star className="mt-0.5 size-4 shrink-0 fill-brand text-brand" /> : <span className="size-4" />}
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">{t.name}</span>
              <span className="block text-[12px] text-muted">
                {t.shortcut} · {t.categoryName}
                {t.mediaCount > 0 ? ` · ${t.mediaCount} archivo(s)` : ""}
              </span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

export function useTemplatePickerState() {
  const [slashQuery, setSlashQuery] = useState<string | null>(null);

  const onValueChange = (value: string) => {
    if (value.startsWith("/")) {
      setSlashQuery(value.slice(1));
    } else {
      setSlashQuery(null);
    }
  };

  return {
    pickerOpen: slashQuery !== null,
    slashQuery: slashQuery ?? "",
    onValueChange,
    closePicker: () => setSlashQuery(null),
    clearSlash: (value: string) => (value.startsWith("/") ? "" : value),
  };
}

export function useTemplateSend(input: {
  conversationId: string;
  to: string;
  customerName?: string;
  onInsertText: (text: string) => void;
  onSent?: () => void;
}) {
  const send = useSendQuickReplyTemplate();

  const handleSelect = async (template: AdvisorQuickReplyTemplate) => {
    const result = await send.mutateAsync({
      templateId: template.id,
      conversationId: input.conversationId,
      to: input.to,
      customerName: input.customerName,
    });
    if (result.mode === "insert" && result.text) {
      input.onInsertText(result.text);
    } else {
      input.onSent?.();
    }
  };

  return { handleSelect, isSending: send.isPending };
}
