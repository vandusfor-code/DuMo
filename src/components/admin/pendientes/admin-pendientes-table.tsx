"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TransferPendienteDialog } from "./transfer-pendiente-dialog";
import { useTransferPendiente } from "@/hooks/use-admin-pendientes";
import { PENDIENTE_STATUS_LABELS } from "@/lib/pendientes-display";
import { cn } from "@/lib/utils";
import type { AdminPendienteRow } from "@/types/admin-pendientes";

function TipificationBadge({ row }: { row: AdminPendienteRow }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ backgroundColor: row.tipificationBadgeBg, color: row.tipificationBadgeText }}
    >
      {row.tipificationName}
    </span>
  );
}

function StatusBadge({ row }: { row: AdminPendienteRow }) {
  const tone =
    row.displayStatus === "atrasado"
      ? "danger"
      : row.displayStatus === "proximo"
        ? "warning"
        : "success";
  return (
    <Badge tone={tone} dot>
      {PENDIENTE_STATUS_LABELS[row.displayStatus]}
    </Badge>
  );
}

export function AdminPendientesTable({
  data,
  total,
  page,
  pageSize,
  advisors,
  onPageChange,
}: {
  data: AdminPendienteRow[];
  total: number;
  page: number;
  pageSize: number;
  advisors: { id: string; name: string }[];
  onPageChange: (page: number) => void;
}) {
  const [transferTarget, setTransferTarget] = useState<AdminPendienteRow | null>(null);
  const transfer = useTransferPendiente();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleTransfer = async (advisorId: string) => {
    if (!transferTarget) return;
    await transfer.mutateAsync({ id: transferTarget.id, advisorId });
    setTransferTarget(null);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha programada</TableHead>
              <TableHead>Asesora</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-12 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted">
                  No hay pendientes con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-ink">{row.customerName || "Sin nombre"}</p>
                      <p className="text-[12px] text-muted">{row.phone || "—"}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TipificationBadge row={row} />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-ink">{row.followUpDate}</p>
                    <p
                      className={cn(
                        "text-[12px]",
                        row.isOverdue ? "font-medium text-danger-ink" : "text-muted",
                      )}
                    >
                      {row.followUpDateLabel}
                    </p>
                  </TableCell>
                  <TableCell>{row.originAdvisorName || "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-[13px] text-muted">
                    {row.note || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge row={row} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTransferTarget(row)}>
                          Transferir a asesora
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[13px] text-muted">
          {total === 0 ? "0 resultados" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-[13px] text-muted">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <TransferPendienteDialog
        open={Boolean(transferTarget)}
        pendiente={transferTarget}
        advisors={advisors}
        isLoading={transfer.isPending}
        onConfirm={handleTransfer}
        onCancel={() => setTransferTarget(null)}
      />
    </>
  );
}
