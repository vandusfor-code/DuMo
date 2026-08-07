"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { InitialsAvatar, PhotoAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUpdateAdvisorGoal } from "@/hooks/use-admin-users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdvisorsResult } from "@/types/admin-advisor";

export function AdvisorsKpis({ summary }: { summary: AdvisorsResult["summary"] }) {
  const cards = [
    { label: "Total asesoras", value: String(summary.total) },
    { label: "Activas", value: String(summary.active) },
    { label: "Ventas del mes", value: String(summary.totalSalesMonth) },
    {
      label: "Meta asignada",
      value:
        summary.teamMonthlyGoal > 0
          ? `${summary.assignedGoalsTotal} / ${summary.teamMonthlyGoal}`
          : String(summary.assignedGoalsTotal),
      hint: "Suma de metas individuales vs meta del equipo",
    },
    { label: "Conversión promedio", value: `${summary.avgConversion}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <p className="text-[12px] text-muted">{c.label}</p>
          <p className="mt-2 text-[24px] font-bold text-ink">{c.value}</p>
          {"hint" in c && c.hint ? (
            <p className="mt-1 text-[11px] text-muted">{c.hint}</p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

function AdvisorGoalInput({
  advisorId,
  value,
}: {
  advisorId: string;
  value: number | null;
}) {
  const update = useUpdateAdvisorGoal();
  const [draft, setDraft] = useState(value != null && value > 0 ? String(value) : "");
  const [saved, setSaved] = useState(value);

  const save = async () => {
    const trimmed = draft.trim();
    const next = trimmed === "" ? null : Math.max(0, Math.round(Number(trimmed)));
    if (next != null && !Number.isFinite(next)) return;
    if (next === saved || (next == null && saved == null)) return;

    try {
      await update.mutateAsync({ id: advisorId, monthlySalesGoal: next });
      setSaved(next);
    } catch {
      setDraft(saved != null && saved > 0 ? String(saved) : "");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        step={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        placeholder="Auto"
        className="h-9 w-24"
        disabled={update.isPending}
      />
      {update.isPending ? <Loader2 className="size-4 animate-spin text-muted" /> : null}
      <span className="text-[12px] text-muted">ventas</span>
    </div>
  );
}

export function AdvisorsTable({ rows }: { rows: AdvisorsResult["rows"] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink">Desempeño por asesora</h3>
        <p className="mt-1 text-[13px] text-muted">
          Asigna la meta mensual de cada asesora. Esa cifra es la que verá en su dashboard y contra
          la que se contabilizan sus ventas. Deja vacío para reparto automático del total del
          equipo.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asesora</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Meta del mes</TableHead>
            <TableHead>Ventas registradas</TableHead>
            <TableHead>Finalizadas</TableHead>
            <TableHead>En reparto</TableHead>
            <TableHead>Conversión</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-[14px] text-muted">
                No hay asesoras registradas. Crea usuarios con rol Asesora en el módulo Usuarios.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {r.avatarUrl ? (
                      <PhotoAvatar src={r.avatarUrl} alt={r.name} />
                    ) : (
                      <InitialsAvatar initials={getInitials(r.name)} />
                    )}
                    <span className="font-semibold text-ink">{r.name}</span>
                  </div>
                </TableCell>
                <TableCell>{r.username}</TableCell>
                <TableCell>
                  <AdvisorGoalInput
                    key={`${r.id}-${r.monthlySalesGoal ?? "auto"}`}
                    advisorId={r.id}
                    value={r.monthlySalesGoal}
                  />
                </TableCell>
                <TableCell>{r.registeredSales}</TableCell>
                <TableCell>{r.finalizedSales}</TableCell>
                <TableCell>{r.inDeliverySales}</TableCell>
                <TableCell>{r.conversionRate}%</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                      r.active ? "bg-success-soft text-success-ink" : "bg-canvas text-muted",
                    )}
                  >
                    {r.active ? "Activa" : "Inactiva"}
                  </span>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
