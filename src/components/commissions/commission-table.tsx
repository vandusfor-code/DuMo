"use client";

import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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
import { Pagination } from "@/components/ui/pagination";
import { CommissionStatusBadge } from "./commission-status-badge";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Commission } from "@/types/commission";

const columnHelper = createColumnHelper<Commission>();

const columns = [
  columnHelper.accessor("date", {
    header: "Fecha",
    cell: (info) => <span className="text-muted">{formatShortDate(info.getValue())}</span>,
  }),
  columnHelper.accessor("saleId", {
    header: "ID Venta",
    cell: (info) => <span className="font-medium text-ink">{info.getValue()}</span>,
  }),
  columnHelper.accessor("customerName", {
    header: "Cliente",
    cell: (info) => <span className="text-ink">{info.getValue()}</span>,
  }),
  columnHelper.accessor("lines", {
    header: "Líneas",
    cell: (info) => <span className="text-muted">{info.getValue()}</span>,
  }),
  columnHelper.accessor("amount", {
    header: "Comisión",
    cell: (info) => (
      <span className="font-semibold text-ink">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => <CommissionStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("paymentDate", {
    header: "Fecha de pago",
    cell: (info) => {
      const value = info.getValue();
      return <span className="text-muted">{value ? formatShortDate(value) : "-"}</span>;
    },
  }),
  columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: (info) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/mis-ventas/${info.row.original.saleId}`}>
            Ver detalle
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>
    ),
  }),
];

export function CommissionTable({ data }: { data: Commission[] }) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
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
                    No hay comisiones en este período
                  </p>
                  <p className="text-[13px] text-muted">
                    Cambia el mes o registra ventas para generar comisiones.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-brand-soft/40">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(cell.column.id === "actions" ? "pr-0" : "first:pl-0")}
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
        itemLabel="comisiones"
        onPageChange={(p) => table.setPageIndex(p - 1)}
        onPageSizeChange={(s) => table.setPageSize(s)}
      />
    </div>
  );
}
