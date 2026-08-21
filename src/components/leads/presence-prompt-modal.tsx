"use client";

import type { ReactNode } from "react";

/**
 * Aviso emergente amigable (no destructivo) para presencia — distinto del
 * ConfirmDialog rojo usado para acciones peligrosas. Overlay fijo, centrado,
 * sin cierre por click afuera ni Escape: siempre se resuelve con un botón
 * explícito, porque es una pregunta real ("¿sigues ahí?"), no un aviso que
 * deba poder ignorarse sin querer.
 */
export function PresencePromptModal({
  open,
  icon,
  title,
  description,
  children,
}: {
  open: boolean;
  icon?: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="presence-prompt-title"
    >
      <div className="w-full max-w-sm rounded-card border border-line bg-card p-6 text-center shadow-pop">
        {icon ? (
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            {icon}
          </div>
        ) : null}
        <h3 id="presence-prompt-title" className="text-[17px] font-semibold text-ink">
          {title}
        </h3>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
        <div className="mt-5 flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}
