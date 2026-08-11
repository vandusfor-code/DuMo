"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Eye, MessageSquareText, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { InitialsAvatar } from "@/components/ui/avatar";
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
import { DuoSaleStatusBadge } from "./duo-sale-status-badge";
import { getInitials } from "@/lib/format";
import { LEAD_SALE_TYPE_LABELS, type LeadSaleType } from "@/types/lead";
import type { DuoSale } from "@/types/duo-sale";

function formatShortDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }),
    time: d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
  };
}

/** Páginas compactas: 1 … p-1 p p+1 … last */
function pageList(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

export function VentasPorCerrarTable({
  data,
  total,
  page,
  pageSize,
  advisorOptions,
  onPageChange,
  onAssign,
}: {
  data: DuoSale[];
  total: number;
  page: number;
  pageSize: number;
  advisorOptions: { id: string; name: string }[];
  onPageChange: (page: number) => void;
  onAssign: (saleId: string, advisor: { id: string; name: string }) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <Card className="p-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-6">Cliente</TableHead>
            <TableHead>Asesora que concretó</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Plan / Producto</TableHead>
            <TableHead>Asesora de cierre</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="pr-6 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((sale) => {
            const { date, time } = formatShortDate(sale.createdAt);
            return (
              <TableRow key={sale.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar initials={getInitials(sale.customerName)} className="size-9 text-[12px]" />
                    <div className="leading-tight">
                      <p className="font-medium text-ink">{sale.customerName}</p>
                      <p className="flex items-center gap-1 text-[12px] text-muted">
                        <span className="size-1.5 rounded-full bg-success" />
                        {sale.phone}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <InitialsAvatar
                      initials={getInitials(sale.originAdvisorName)}
                      className="size-8 bg-canvas text-[11px] text-ink"
                    />
                    <span className="text-ink">{sale.originAdvisorName}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="leading-tight">
                    <p className="text-ink">{date}</p>
                    <p className="text-[12px] text-muted">{time}</p>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="leading-tight">
                    <p className="text-ink">{sale.plan || "—"}</p>
                    <p className="text-[12px] text-muted">
                      {sale.saleType ? LEAD_SALE_TYPE_LABELS[sale.saleType as LeadSaleType] : "—"}
                    </p>
                  </div>
                </TableCell>

                <TableCell>
                  {sale.closingAdvisorId ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand">
                      <MessageSquareText className="size-3.5" />
                      {sale.closingAdvisorName}
                    </span>
                  ) : (
                    <Select
                      onValueChange={(advisorId) => {
                        const advisor = advisorOptions.find((a) => a.id === advisorId);
                        if (advisor) onAssign(sale.id, advisor);
                      }}
                    >
                      <SelectTrigger className="h-9 w-[168px] border-none bg-transparent p-0 text-[13px] font-medium text-brand shadow-none hover:bg-brand-soft focus:ring-0 [&>svg]:text-brand">
                        <SelectValue placeholder="Asignar asesora" />
                      </SelectTrigger>
                      <SelectContent>
                        {advisorOptions.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                <TableCell>
                  <DuoSaleStatusBadge sale={sale} />
                </TableCell>

                <TableCell className="pr-6 text-right">
                  <RowActions sale={sale} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-6 py-4 sm:flex-row">
        <p className="text-[13px] text-muted">
          Mostrando {from} a {to} de {total} ventas por cerrar
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`e-${i}`} className="px-1.5 text-[13px] text-muted">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={
                  p === page
                    ? "grid size-8 place-items-center rounded-lg bg-brand text-[13px] font-semibold text-white"
                    : "grid size-8 place-items-center rounded-lg text-[13px] font-medium text-ink transition-colors hover:bg-canvas"
                }
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function RowActions({ sale: _sale }: { sale: DuoSale }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label="Más acciones"
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand data-[state=open]:bg-brand-soft data-[state=open]:text-brand"
      >
        <MoreVertical className="size-[17px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Eye className="size-4" /> Ver conversación
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MessageSquareText className="size-4" /> Escribir mensaje
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Eye className="size-4" /> Ver detalles de venta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
