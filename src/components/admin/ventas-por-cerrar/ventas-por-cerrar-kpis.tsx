"use client";

import { CheckCircle2, PhoneMissed, Users, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Trazo ondulado decorativo — mismo look en las 4 tarjetas, sin datos reales. */
function Sparkline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 28"
      className={cn("h-6 w-full", className)}
      fill="none"
      preserveAspectRatio="none"
    >
      <path
        d="M0 20 C 12 6, 24 24, 36 14 S 60 4, 72 16 S 96 26, 108 10 S 120 8, 120 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

export function VentasPorCerrarKpis({
  pendingAssignment,
  assigned,
  noContact,
  closedToday,
}: {
  pendingAssignment: number;
  assigned: number;
  noContact: number;
  closedToday: number;
}) {
  const cards = [
    {
      icon: <Users />,
      tint: "bg-brand-soft text-brand",
      value: pendingAssignment,
      label: "Total pendientes",
      sub: "de asignar",
    },
    {
      icon: <UserCheck />,
      tint: "bg-success-soft text-success-ink",
      value: assigned,
      label: "Asignadas",
      sub: "en proceso",
    },
    {
      icon: <PhoneMissed />,
      tint: "bg-danger-soft text-danger-ink",
      value: noContact,
      label: "Sin contactar",
      sub: '"no contesta"',
    },
    {
      icon: <CheckCircle2 />,
      tint: "bg-[#ede9fe] text-[#6d28d9]",
      value: closedToday,
      label: "Cerradas hoy",
      sub: "operación duo",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <span className={cn("grid size-11 place-items-center rounded-full [&_svg]:size-5", c.tint)}>
            {c.icon}
          </span>
          <p className="mt-3.5 text-[28px] font-bold leading-tight text-ink">{c.value}</p>
          <p className="text-[13px] text-muted">
            {c.label} <span className="text-muted/80">{c.sub}</span>
          </p>
          <Sparkline className={c.tint.split(" ")[1]} />
        </Card>
      ))}
    </div>
  );
}
