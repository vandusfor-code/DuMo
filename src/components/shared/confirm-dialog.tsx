"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Diálogo de confirmación para acciones destructivas.
 * Si se pasa `confirmPhrase`, hay que escribirla para habilitar el botón
 * (se usa en el borrado masivo, que es irreversible).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  confirmPhrase,
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmPhrase?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const ready = !confirmPhrase || typed.trim() === confirmPhrase;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-card border border-line bg-card p-6 shadow-pop"
      >
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-danger-soft text-danger-ink">
            <AlertTriangle className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">{description}</p>
          </div>
        </div>

        {confirmPhrase && (
          <div className="mt-5 space-y-2">
            <p className="text-[13px] text-muted">
              Para confirmar, escribe{" "}
              <span className="font-semibold text-ink">{confirmPhrase}</span>
            </p>
            <input
              autoFocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="h-11 w-full rounded-input border border-line bg-card px-3.5 text-[14px] text-ink outline-none focus-visible:border-danger"
              placeholder={confirmPhrase}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!ready || isLoading}
            className="bg-danger text-white hover:bg-danger-ink"
          >
            {isLoading && <Loader2 className="size-[18px] animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
