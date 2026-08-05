"use client";

import { InitialsAvatar, PhotoAvatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
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
    { label: "Conversión promedio", value: `${summary.avgConversion}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <p className="text-[12px] text-muted">{c.label}</p>
          <p className="mt-2 text-[24px] font-bold text-ink">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}

export function AdvisorsTable({ rows }: { rows: AdvisorsResult["rows"] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink">Desempeño por asesora</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asesora</TableHead>
            <TableHead>Usuario</TableHead>
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
              <TableCell colSpan={7} className="py-10 text-center text-[14px] text-muted">
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
