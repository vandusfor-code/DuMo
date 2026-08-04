import { Calendar } from "lucide-react";

/** Non-editable "Fecha de registro" card, auto-filled with today's date. */
export function AutoDateCard() {
  const today = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-line bg-card px-5 py-3 shadow-card">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
        <Calendar className="size-[18px]" />
      </span>
      <div className="leading-tight">
        <p className="text-[12px] text-muted">Fecha de registro</p>
        <p className="text-[14px] font-semibold text-ink">{today}</p>
      </div>
    </div>
  );
}
