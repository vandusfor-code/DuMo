"use client";

import { useState } from "react";
import { Mic, Paperclip, Send, Smile } from "lucide-react";

/** Chat composer. UI only — sending is not wired to any backend. */
export function ChatInput() {
  const [value, setValue] = useState("");
  const hasText = value.trim().length > 0;

  return (
    <div className="flex items-center gap-2 border-t border-line px-4 py-3">
      <button
        type="button"
        aria-label="Emoji"
        className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Smile className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Adjuntar"
        className="grid size-9 place-items-center rounded-xl text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Paperclip className="size-5" />
      </button>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribe un mensaje..."
        className="h-11 flex-1 rounded-full border border-line bg-canvas px-4 text-[14px] text-ink outline-none transition-colors focus-visible:border-brand focus-visible:bg-card"
      />
      <button
        type="button"
        aria-label={hasText ? "Enviar" : "Nota de voz"}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover"
      >
        {hasText ? <Send className="size-[18px]" /> : <Mic className="size-[18px]" />}
      </button>
    </div>
  );
}
