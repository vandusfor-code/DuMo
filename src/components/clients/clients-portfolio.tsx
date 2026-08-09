"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InitialsAvatar } from "@/components/ui/avatar";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DynamicTipificationBadge } from "@/components/shared/dynamic-tipification-badge";
import { formatLongDate, getInitials } from "@/lib/format";
import type { CrmClient } from "@/types/crm-client";

type DateRange = "today" | "week" | "month" | "all";

const RANGE_OPTIONS = [
  { label: "Hoy", value: "today" as const },
  { label: "Esta semana", value: "week" as const },
  { label: "Este mes", value: "month" as const },
  { label: "Todas", value: "all" as const },
];

function inRange(dateIso: string, range: DateRange): boolean {
  if (range === "all") return true;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (range === "today") return dateIso === todayStr;
  if (range === "month") return dateIso.slice(0, 7) === todayStr.slice(0, 7);
  const [y, m, d] = todayStr.split("-").map(Number);
  const date = new Date(dateIso);
  const dayOfWeek = (new Date(y, m - 1, d).getDay() + 6) % 7;
  const monday = new Date(y, m - 1, d - dayOfWeek);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return date >= monday && date <= sunday;
}

function buildColumns(showAdvisor: boolean, leadsHref: string) {
  const columnHelper = createColumnHelper<CrmClient>();

  const base = [
    columnHelper.accessor("customerName", {
      header: "Cliente",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <InitialsAvatar initials={getInitials(row.customerName)} />
            <div className="leading-tight">
              <p className="font-medium text-ink">{row.customerName}</p>
              <p className="text-[13px] text-muted">{row.rut || row.phone}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("gestionType", {
      header: "Tipificación",
      cell: (info) => <DynamicTipificationBadge slug={info.getValue()} />,
    }),
    columnHelper.accessor("updatedDate", {
      header: "Última gestión",
      cell: (info) => (
        <span className="text-muted">{formatLongDate(info.getValue())}</span>
      ),
    }),
  ];

  const advisorCol = showAdvisor
    ? [
        columnHelper.accessor("advisorName", {
          header: "Asesora",
          cell: (info) => <span className="text-muted">{info.getValue() || "—"}</span>,
        }),
      ]
    : [];

  const actionsCol = columnHelper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: (info) => (
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link
            href={`${leadsHref}?conversationId=${encodeURIComponent(info.row.original.conversationId)}`}
          >
            <MessageSquare className="size-4" />
            Ver conversación
          </Link>
        </Button>
      </div>
    ),
  });

  return [...base, ...advisorCol, actionsCol];
}

export function ClientsPortfolio({
  clients,
  showAdvisor = false,
  isLoading,
  leadsHref = "/dashboard/leads",
}: {
  clients: CrmClient[];
  showAdvisor?: boolean;
  isLoading?: boolean;
  leadsHref?: string;
}) {
  const [range, setRange] = useState<DateRange>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (!inRange(c.updatedDate, range)) return false;
      if (!q) return true;
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
  }, [clients, range, search]);

  const columns = useMemo(
    () => buildColumns(showAdvisor, leadsHref),
    [showAdvisor, leadsHref],
  );
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div className="space-y-6 pt-1">
      <PageHeader
        title="Clientes"
        subtitle={
          showAdvisor
            ? "Base general de clientes tipificados por todas las asesoras."
            : "Clientes que has tipificado o gestionado desde Leads."
        }
      />

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o RUT..."
              className="h-11 pl-10"
            />
          </div>
          <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
        </div>
      </Card>

      <Card className="p-7">
        {isLoading ? (
          <p className="py-12 text-center text-[14px] text-muted">Cargando clientes…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-muted">
            No hay clientes guardados. Tipifica o guarda gestiones desde Leads.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              total={filtered.length}
              itemLabel="clientes"
              onPageChange={(p) => table.setPageIndex(p - 1)}
              onPageSizeChange={(s) => table.setPageSize(s)}
            />
          </>
        )}
      </Card>
    </div>
  );
}
