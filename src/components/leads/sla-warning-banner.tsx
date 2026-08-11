"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlaWarningEvent {
  id: string;
  conversationId: string;
  customerName: string;
  scenario: "first_contact" | "follow_up";
  status: "warning_sent" | "final_warning_sent";
  minutesUnanswered: number;
}

function warningMessage(event: SlaWarningEvent): string {
  const name = event.customerName || "el cliente";
  if (event.status === "final_warning_sent") {
    return `Por favor responder a ${name}, o será reasignado en 1 minuto.`;
  }
  if (event.scenario === "follow_up") {
    return `${name} está esperando respuesta, o será reasignado en 1 minuto.`;
  }
  return `Nuevo lead ${name}, recuerda responder pronto.`;
}

/**
 * RESP-2 — aviso a nivel de sesión: flota sobre toda la pantalla, no solo
 * el panel de la conversación afectada, para que la asesora se entere
 * aunque esté atendiendo otro chat en ese momento.
 */
export function SlaWarningBanners({
  events,
  onDismiss,
}: {
  events: SlaWarningEvent[];
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {events.map((event) => (
        <div
          key={event.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2.5 rounded-card border px-4 py-3 shadow-lg",
            event.status === "final_warning_sent"
              ? "border-danger/30 bg-danger-soft text-danger-ink"
              : "border-warning/30 bg-warning-soft text-warning-ink",
          )}
        >
          <AlertTriangle className="mt-0.5 size-[18px] shrink-0" />
          <button
            type="button"
            className="flex-1 text-left text-[13px] leading-snug"
            onClick={() => {
              router.push(`/dashboard/leads?conversationId=${event.conversationId}`);
              onDismiss(event.id);
            }}
          >
            {warningMessage(event)}
          </button>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => onDismiss(event.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
