"use client";

import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PENDIENTE_STATUS_LABELS } from "@/lib/pendientes-display";
import { cn } from "@/lib/utils";
import type { AdvisorRecuperacionRow } from "@/types/advisor-recuperacion";

function TipificationBadge({ row }: { row: AdvisorRecuperacionRow }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ backgroundColor: row.tipificationBadgeBg, color: row.tipificationBadgeText }}
    >
      {row.tipificationName}
    </span>
  );
}

function StatusBadge({ row }: { row: AdvisorRecuperacionRow }) {
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

export function RecuperacionTable({
  data,
  total,
  page,
  pageSize,
  selectedConversationId,
  onOpenChat,
  onPageChange,
}: {
  data: AdvisorRecuperacionRow[];
  total: number;
  page: number;
  pageSize: number;
  selectedConversationId: string | null;
  onOpenChat: (row: AdvisorRecuperacionRow) => void;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha programada</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted">
                  No tienes leads en recuperación con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    selectedConversationId === row.conversationId && "bg-brand-soft/40",
                  )}
                >
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
                    <Button variant="outline" size="sm" onClick={() => onOpenChat(row)}>
                      <MessageSquare className="size-4" />
                      Abrir chat
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-2">
        <p className="text-[13px] text-muted">
          {total === 0
            ? "0 resultados"
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
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
    </>
  );
}
