"use client";

import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import { SaleStatusBadge } from "@/components/shared/sale-status-badge";
import { formatLongDate, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SaleSummary } from "@/types/sale";

const columnHelper = createColumnHelper<SaleSummary>();

const columns = [
  columnHelper.accessor("customerName", {
    header: "Cliente",
    cell: (info) => {
      const sale = info.row.original;
      return (
        <div className="flex items-center gap-3">
          <InitialsAvatar initials={getInitials(sale.customerName)} />
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-ink">{sale.customerName}</p>
              {sale.isDuo && (
                <span
                  title="Operación Duo — cerrada por otra asesora, comisión dividida al 50/50."
                  className="inline-flex items-center rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand"
                >
                  Operación Duo
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted">{sale.rut}</p>
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("date", {
    header: "Fecha",
    cell: (info) => (
      <span className="text-muted">{formatLongDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("lines", {
    header: "Líneas",
    cell: (info) => <span className="text-muted">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => <SaleStatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: (info) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/mis-ventas/${info.row.original.id}`}>
            Ver detalle
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    ),
  }),
];

export function SalesTable({ data }: { data: SaleSummary[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-line">
            {table.getHeaderGroups()[0].headers.map((header) => (
              <TableHead
                key={header.id}
                className={header.id === "actions" ? "pr-0 text-right" : "first:pl-0"}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-16">
                <div className="flex flex-col items-center gap-2 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-canvas text-muted">
                    <Inbox className="size-6" />
                  </span>
                  <p className="text-[15px] font-medium text-ink">
                    No hay ventas registradas
                  </p>
                  <p className="text-[13px] text-muted">
                    Registra tu primera venta para verla aquí.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="min-h-[72px] hover:bg-brand-soft/40">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      "py-4",
                      cell.column.id === "actions" ? "pr-0" : "first:pl-0",
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Pagination
        page={pageIndex + 1}
        pageSize={pageSize}
        total={data.length}
        itemLabel="ventas"
        onPageChange={(p) => table.setPageIndex(p - 1)}
        onPageSizeChange={(s) => table.setPageSize(s)}
      />
    </div>
  );
}
