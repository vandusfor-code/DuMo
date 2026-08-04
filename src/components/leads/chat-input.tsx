"use client";

import { useState } from "react";
import { Loader2, Mic, Paperclip, Send, Smile } from "lucide-react";
import { useSendMessage } from "@/hooks/use-leads";

/**
 * Composer del chat. Envía por la Cloud API (si está configurada); el mensaje
 * se persiste como saliente y la bandeja se refresca sola.
 */
export function ChatInput({
  conversationId,
  to,
}: {
  conversationId: string;
  to: string;
}) {
  const [value, setValue] = useState("");
  const send = useSendMessage(conversationId);
  const hasText = value.trim().length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || send.isPending) return;
    send.mutate(
      { to, text },
      {
        onSuccess: () => setValue(""),
      },
    );
  };

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex items-center gap-2">
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Escribe un mensaje..."
          className="h-11 flex-1 rounded-full border border-line bg-canvas px-4 text-[14px] text-ink outline-none transition-colors focus-visible:border-brand focus-visible:bg-card"
        />
        <button
          type="button"
          onClick={submit}
          disabled={send.isPending || !hasText}
          aria-label={hasText ? "Enviar" : "Nota de voz"}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {send.isPending ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : hasText ? (
            <Send className="size-[18px]" />
          ) : (
            <Mic className="size-[18px]" />
          )}
        </button>
      </div>
      {send.isError && (
        <p className="mt-1.5 text-[12px] text-danger-ink">
          {send.error instanceof Error
            ? send.error.message
            : "No se pudo enviar. Revisa la configuración de WhatsApp."}
        </p>
      )}
    </div>
  );
}
