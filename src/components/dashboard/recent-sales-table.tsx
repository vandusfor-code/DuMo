"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { InitialsAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SaleStatusBadge } from "@/components/shared/sale-status-badge";
import { formatShortDate, getInitials } from "@/lib/format";
import { useDeleteSale } from "@/hooks/use-sales";
import { SALE_TYPE_LABELS, type RecentSale } from "@/types/sale";

function RowActions({
  sale,
  onDelete,
}: {
  sale: RecentSale;
  onDelete: (sale: RecentSale) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Acciones para ${sale.customerName}`}
        className="grid size-9 place-items-center rounded-lg text-muted outline-none transition-colors hover:bg-brand-soft hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/30 data-[state=open]:bg-brand-soft data-[state=open]:text-brand"
      >
        <MoreVertical className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/mis-ventas/${sale.id}`}>
            <Eye /> Ver detalle
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/mis-ventas/${sale.id}`}>
            <Pencil /> Editar venta
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={() => onDelete(sale)}>
          <Trash2 /> Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RecentSalesTable({ sales }: { sales: RecentSale[] }) {
  const deleteSale = useDeleteSale();
  const [pendingDelete, setPendingDelete] = useState<RecentSale | null>(null);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteSale.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch {
      /* error handled by mutation state if needed */
    }
  };

  return (
    <>
      <Card className="p-7">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ink">
            Últimas ventas registradas
          </h3>
          <Link
            href="/dashboard/mis-ventas"
            className="text-[14px] font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            Ver todas
          </Link>
        </div>

        <div className="mt-5">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-line">
                <TableHead className="pl-0">Cliente</TableHead>
                <TableHead>Tipo de venta</TableHead>
                <TableHead>Líneas</TableHead>
                <TableHead>Plan vendido</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-0 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-brand-soft/40">
                  <TableCell className="pl-0">
                    <div className="flex items-center gap-3">
                      <InitialsAvatar initials={getInitials(sale.customerName)} />
                      <div className="leading-tight">
                        <p className="font-medium text-ink">{sale.customerName}</p>
                        <p className="text-[13px] text-muted">{sale.rut}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted">
                    {SALE_TYPE_LABELS[sale.saleType]}
                  </TableCell>
                  <TableCell className="text-muted">{sale.lines}</TableCell>
                  <TableCell className="text-muted">{sale.plan}</TableCell>
                  <TableCell className="text-muted">
                    {formatShortDate(sale.date)}
                  </TableCell>
                  <TableCell>
                    <SaleStatusBadge status={sale.status} />
                  </TableCell>
                  <TableCell className="pr-0 text-right">
                    <div className="flex justify-end">
                      <RowActions sale={sale} onDelete={setPendingDelete} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Eliminar venta"
        description={
          pendingDelete
            ? `¿Eliminar la venta de ${pendingDelete.customerName}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        isLoading={deleteSale.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
