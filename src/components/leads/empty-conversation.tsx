import { MessagesSquare } from "lucide-react";

/** Shown in the center + right columns when no conversation is selected. */
export function EmptyConversation() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-5 px-8 text-center">
      <span className="grid size-20 place-items-center rounded-card border border-line bg-hover text-brand shadow-card">
        <MessagesSquare className="size-9" />
      </span>
      <div>
        <p className="text-[20px] font-semibold text-ink">Selecciona una conversación</p>
        <p className="mt-2 max-w-sm text-[14px] leading-[1.45] text-muted">
          Elige un chat de la bandeja para ver los mensajes y registrar la gestión comercial.
        </p>
      </div>
    </div>
  );
}
