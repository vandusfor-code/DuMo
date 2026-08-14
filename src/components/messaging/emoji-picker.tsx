"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Frecuentes",
    emojis: [
      "😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😘", "😉", "🙂",
      "🤗", "🤩", "👍", "👎", "👏", "🙏", "👌", "✌️", "🤝", "💪",
      "✅", "❌", "❤️", "🔥", "⭐", "🎉", "🙌", "👋", "😅", "😂",
    ],
  },
  {
    label: "Gestos",
    emojis: [
      "🤔", "😏", "😌", "😎", "🥳", "😇", "🙃", "😋", "😜", "🤪",
      "😴", "🥱", "😮", "😯", "😲", "😳", "🥺", "😢", "😭", "😤",
      "😡", "🤯", "😱", "🙈", "🙊", "👀", "💯", "✨", "💥", "💫",
    ],
  },
  {
    label: "Objetos",
    emojis: [
      "📱", "💻", "📦", "📝", "📌", "📍", "🏠", "🚗", "⏰", "📅",
      "💰", "💳", "📄", "📞", "💬", "🔔", "📎", "🛍️", "🎁", "🏆",
    ],
  },
];

export function insertTextAtCursor(
  current: string,
  insert: string,
  el: HTMLInputElement | HTMLTextAreaElement | null,
): { next: string; caret: number } {
  const start = el?.selectionStart ?? current.length;
  const end = el?.selectionEnd ?? current.length;
  const next = current.slice(0, start) + insert + current.slice(end);
  return { next, caret: start + insert.length };
}

export function EmojiPicker({
  open,
  onSelect,
  onClose,
}: {
  open: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className="absolute bottom-full left-0 z-30 mb-2 w-[min(100%,22rem)] rounded-2xl border border-line bg-card p-3 shadow-lg"
      role="dialog"
      aria-label="Emojis"
    >
      <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={`${group.label}-${emoji}`}
                  type="button"
                  aria-label={`Insertar ${emoji}`}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg text-[20px] leading-none",
                    "hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:outline-none",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
