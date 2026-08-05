"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Download,
  Eye,
  MoreVertical,
  Pencil,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { InitialsAvatar, PhotoAvatar } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/format";
import type {
  AdminCommissionAdvisor,
  AdminCommissionFilters,
  AdminCommissionSummary,
} from "@/types/admin-commission";
import { ADMIN_COMMISSION_STATUS_LABELS } from "@/types/admin-commission";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function CommissionKpis({ summary }: { summary: AdminCommissionSummary }) {
  const cards = [
    { label: "Comisiones pendientes", value: money.format(summary.pendingTotal), tint: "bg-warning-soft text-warning-ink" },
    { label: "Comisiones pagadas", value: money.format(summary.paidTotal), tint: "bg-success-soft text-success-ink" },
    { label: "Ventas finalizadas", value: String(summary.finalizedSales), tint: "bg-brand-soft text-brand" },
    { label: "Valor total a pagar", value: money.format(summary.totalToPay), tint: "bg-[#e8f0fe] text-[#2563eb]" },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-4">
          <span className={cn("inline-block rounded-xl px-2 py-1 text-[12px] font-medium", c.tint)}>
            {c.label}
          </span>
          <p className="mt-3 text-[24px] font-bold text-ink">{c.value}</p>
        </Card>
      ))}
    </div>
  );
}

export function CommissionFiltersBar({
  filters,
  advisors,
  onChange,
}: {
  filters: AdminCommissionFilters;
  advisors: { id: string; name: string }[];
  onChange: (f: AdminCommissionFilters) => void;
}) {
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const years = ["2024", "2025", "2026"];

  return (
    <Card className="flex flex-wrap items-center gap-3 p-4">
      <Select value={filters.month} onValueChange={(v) => onChange({ ...filters, month: v })}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Mes" /></SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.year} onValueChange={(v) => onChange({ ...filters, year: v })}>
        <SelectTrigger className="w-[100px]"><SelectValue placeholder="Año" /></SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.advisor} onValueChange={(v) => onChange({ ...filters, advisor: v })}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asesora" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {advisors.map((a) => (
            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v as AdminCommissionFilters["status"] })}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="paid">Pagada</SelectItem>
        </SelectContent>
      </Select>
    </Card>
  );
}

export function CommissionTable({
  rows,
  onMarkPaid,
  filters,
}: {
  rows: AdminCommissionAdvisor[];
  onMarkPaid: (advisorId: string) => void;
  filters: AdminCommissionFilters;
}) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asesora</TableHead>
            <TableHead>Ventas registradas</TableHead>
            <TableHead>Ventas finalizadas</TableHead>
            <TableHead>Comisión calculada</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha pago</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
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
              <TableCell>{r.registeredSales}</TableCell>
              <TableCell>{r.finalizedSales}</TableCell>
              <TableCell className="font-semibold">{money.format(r.calculatedCommission)}</TableCell>
              <TableCell>
                <span className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                  r.status === "paid" ? "bg-success-soft text-success-ink" : "bg-warning-soft text-warning-ink",
                )}>
                  {ADMIN_COMMISSION_STATUS_LABELS[r.status]}
                </span>
              </TableCell>
              <TableCell>{r.paymentDate ?? "—"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                      <MoreVertical className="size-4 text-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/comisiones/${r.id}?month=${filters.month}&year=${filters.year}`}>
                        <Eye className="size-4" /> Ver detalle
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem><Pencil className="size-4" /> Editar</DropdownMenuItem>
                    {r.status === "pending" && (
                      <DropdownMenuItem onClick={() => onMarkPaid(r.id)}>
                        <CheckCircle2 className="size-4" /> Marcar pagada
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem><Download className="size-4" /> Exportar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
