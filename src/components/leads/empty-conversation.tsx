import { MessagesSquare } from "lucide-react";

/** Shown in the center + right columns when no conversation is selected. */
export function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-brand-soft text-brand">
        <MessagesSquare className="size-9" />
      </span>
      <div>
        <p className="text-[17px] font-semibold text-ink">
          Selecciona una conversación para comenzar
        </p>
        <p className="mt-1 max-w-xs text-[14px] text-muted">
          Elige un chat de la bandeja para ver los mensajes y registrar la gestión
          comercial.
        </p>
      </div>
    </div>
  );
}
