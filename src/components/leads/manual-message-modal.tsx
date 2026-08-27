"use client";

import { useState } from "react";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSendManualMessage } from "@/hooks/use-manual-message";

/**
 * "Nueva conversación" — para cuando el cliente está en llamada y pide que
 * le escriban a WhatsApp: la asesora pone el número y el mensaje, se manda
 * de una vez por la sesión de WhatsApp Web conectada, y la conversación
 * queda asignada a quien la creó (sin pasar por el reparto automático).
 */
export function ManualMessageModal({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent?: (conversationId: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const send = useSendManualMessage();

  if (!open) return null;

  const reset = () => {
    setPhone("");
    setName("");
    setText("");
    setError(null);
  };

  const handleClose = () => {
    if (send.isPending) return;
    reset();
    onClose();
  };

  const handleSend = async () => {
    setError(null);
    if (!phone.trim()) return setError("Escribe el número de teléfono.");
    if (!text.trim()) return setError("Escribe el mensaje.");
    try {
      const result = await send.mutateAsync({ phone: phone.trim(), name: name.trim(), text: text.trim() });
      onSent?.(result.conversationId);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-message-title"
    >
      <div className="w-full max-w-sm rounded-card border border-line bg-card p-6 shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
              <MessageSquarePlus className="size-5" />
            </span>
            <div>
              <h3 id="manual-message-title" className="text-[16px] font-semibold text-ink">
                Nueva conversación
              </h3>
              <p className="text-[12px] text-muted">Escríbele tú primero por WhatsApp</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Cerrar"
            className="grid size-8 shrink-0 place-items-center rounded-btn text-muted transition-colors hover:bg-hover hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-[13px] text-muted">Número de teléfono</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej. 56912345678"
              autoFocus
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Nombre (opcional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cómo se llama el cliente"
              className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Mensaje</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Hola, te escribo por lo que hablamos por teléfono..."
              className="mt-1.5 min-h-[90px] w-full rounded-xl border border-line px-4 py-3 text-[14px]"
            />
          </label>
          {error ? <p className="text-[13px] text-danger-ink">{error}</p> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={handleClose} disabled={send.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={send.isPending}>
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
