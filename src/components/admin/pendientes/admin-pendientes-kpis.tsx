"use client";

import { CalendarClock, ClipboardList, MessageSquareText, ReceiptText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AdminPendientesSummary } from "@/types/admin-pendientes";

export function AdminPendientesKpis({ summary }: { summary: AdminPendientesSummary }) {
  const cards = [
    {
      icon: <ClipboardList />,
      tint: "bg-brand-soft text-brand",
      label: "Total pendientes",
      value: summary.totalPending,
      sub: "Cola admin activa",
    },
    {
      icon: <ReceiptText />,
      tint: "bg-[#fef3c7] text-[#b45309]",
      label: "Pago de deuda",
      value: summary.deuda,
      sub: "Deuda / Deuda WOM / Donante",
    },
    {
      icon: <CalendarClock />,
      tint: "bg-[#ede9fe] text-[#6d28d9]",
      label: "Fin de permanencia",
      value: summary.permanencia,
      sub: "Permanencia",
    },
    {
      icon: <MessageSquareText />,
      tint: "bg-success-soft text-success-ink",
      label: "Seguimiento",
      value: summary.seguimiento,
      sub: "Seguimiento / Pendiente / Reagenda",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <span className={cn("grid size-10 place-items-center rounded-xl [&_svg]:size-5", c.tint)}>
            {c.icon}
          </span>
          <p className="mt-3 text-[12px] text-muted">{c.label}</p>
          <p className="text-[24px] font-bold leading-tight text-ink">{c.value}</p>
          <p className="text-[12px] text-muted">{c.sub}</p>
        </Card>
      ))}
    </div>
  );
}
