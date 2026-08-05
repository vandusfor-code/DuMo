"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
  UserCog,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  AdminSaleStatusBadge,
  STATUS_LEGEND,
} from "./admin-sale-status-badge";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ADMIN_SALE_STATUS_LABELS,
  ADMIN_SALE_TYPE_LABELS,
  type AdminSale,
} from "@/types/admin-sale";

function Check({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 cursor-pointer rounded border-line accent-brand"
    />
  );
}

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const columnHelper = createColumnHelper<AdminSale>();

function buildColumns() {
  return [
    columnHelper.display({
      id: "select",
      enableHiding: false,
      header: () => null,
      cell: () => null,
    }),
    columnHelper.accessor("id", {
      header: "ID Venta",
      cell: (i) => <span className="font-semibold text-ink">{i.getValue()}</span>,
    }),
    columnHelper.accessor("date", {
      header: "Fecha",
      cell: (i) => (
        <div className="leading-tight">
          <p className="text-ink">{i.getValue()}</p>
          <p className="text-[12px] text-muted">{i.row.original.time}</p>
        </div>
      ),
    }),
    columnHelper.accessor("customerName", {
      header: "Cliente",
      cell: (i) => (
        <div className="leading-tight">
          <p className="font-medium text-ink">{i.getValue()}</p>
          <p className="text-[12px] text-muted">RUT {i.row.original.rut}</p>
        </div>
      ),
    }),
    columnHelper.accessor("advisor", {
      header: "Asesora",
      cell: (i) => (
        <div className="flex items-center gap-2">
          <InitialsAvatar initials={getInitials(i.getValue())} className="size-8 text-[11px]" />
          <span className="text-ink">{i.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor("type", {
      header: "Tipo de venta",
      cell: (i) => <span className="text-muted">{ADMIN_SALE_TYPE_LABELS[i.getValue()]}</span>,
    }),
    columnHelper.accessor("plan", {
      header: "Plan / Producto",
      cell: (i) => <span className="text-muted">{i.getValue()}</span>,
    }),
    columnHelper.accessor("womValue", {
      header: "Valor Wom",
      cell: (i) => <span className="text-muted">{money.format(i.getValue())}</span>,
    }),
    columnHelper.accessor("dumoValue", {
      header: "Valor DuMo",
      cell: (i) => <span className="font-medium text-ink">{money.format(i.getValue())}</span>,
    }),
    columnHelper.accessor("status", {
      header: "Estado",
      cell: (i) => <AdminSaleStatusBadge status={i.getValue()} />,
    }),
    columnHelper.accessor("lines", {
      header: "Líneas",
      cell: (i) => <span className="text-muted">{i.getValue()}</span>,
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: (i) => <RowActions sale={i.row.original} />,
    }),
  ];
}

function RowActions({ sale }: { sale: AdminSale }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/ventas/${sale.id.replace("#", "")}`}
        aria-label="Ver detalle"
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Eye className="size-[17px]" />
      </Link>
      <button
        type="button"
        aria-label="Editar"
        className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand"
      >
        <Pencil className="size-[17px]" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Más acciones"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand data-[state=open]:bg-brand-soft data-[state=open]:text-brand"
        >
          <MoreVertical className="size-[17px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem><RefreshCw /> Cambiar estado</DropdownMenuItem>
          <DropdownMenuItem><UserCog /> Cambiar asesora</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem tone="danger"><Trash2 /> Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
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

export function AdminSalesTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
}: {
  data: AdminSale[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const columns = useMemo(() => buildColumns(), []);

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility: visibility },
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const pageIds = data.map((d) => d.id);
  const allChecked = pageIds.length > 0 && pageIds.every((id) => selected[id]);
  const selectedCount = Object.values(selected).filter(Boolean).length;

  const toggleAll = (v: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of pageIds) next[id] = v;
      return next;
    });
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="text-[16px] font-semibold text-ink">Listado de ventas</h3>
        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[13px] font-medium text-ink transition-colors hover:bg-canvas">
              <Columns3 className="size-4 text-muted" />
              Columnas
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
              {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    col.toggleVisibility();
                  }}
                >
                  <input type="checkbox" readOnly checked={col.getIsVisible()} className="size-3.5 accent-brand" />
                  {typeof col.columnDef.header === "string" ? col.columnDef.header : col.id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-[13px] text-muted">
            Mostrando {from} a {to} de {total} ventas
          </span>

          <div className="flex items-center gap-1">
            <PagerBtn disabled={page <= 1} onClick={() => onPageChange(page - 1)} label="Anterior">
              <ChevronLeft className="size-4" />
            </PagerBtn>
            {pageList(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-[13px] text-muted">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={cn(
                    "grid size-8 place-items-center rounded-lg text-[13px] font-medium transition-colors",
                    p === page ? "border border-brand/30 bg-brand-soft text-brand" : "text-muted hover:bg-brand-soft hover:text-brand",
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <PagerBtn disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} label="Siguiente">
              <ChevronRight className="size-4" />
            </PagerBtn>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-line">
              {table.getHeaderGroups()[0].headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    header.id === "select" ? "w-10 pl-0" : "",
                    header.id === "actions" ? "pr-0 text-right" : "",
                  )}
                >
                  {header.id === "select" ? (
                    <Check checked={allChecked} onChange={toggleAll} ariaLabel="Seleccionar todo" />
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-brand-soft/30">
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cn(
                      cell.column.id === "select" ? "pl-0" : "",
                      cell.column.id === "actions" ? "pr-0" : "",
                    )}
                  >
                    {cell.column.id === "select" ? (
                      <Check
                        checked={!!selected[row.original.id]}
                        onChange={(v) => setSelected((p) => ({ ...p, [row.original.id]: v }))}
                        ariaLabel={`Seleccionar ${row.original.id}`}
                      />
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer: acciones masivas + leyenda */}
      <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-muted">
            Acciones masivas{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </span>
          <Select>
            <SelectTrigger className="h-9 w-[190px] text-[13px]">
              <SelectValue placeholder="Selecciona una acción" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ADMIN_SALE_STATUS_LABELS) as (keyof typeof ADMIN_SALE_STATUS_LABELS)[]).map((s) => (
                <SelectItem key={s} value={s}>Marcar como {ADMIN_SALE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="subtle" size="sm" disabled={selectedCount === 0}>
            Aplicar
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {STATUS_LEGEND.map((l) => (
            <span key={l.status} className="inline-flex items-center gap-1.5 text-[12px] text-muted">
              <span className={cn("size-2 rounded-full", l.dot)} />
              {ADMIN_SALE_STATUS_LABELS[l.status]}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function PagerBtn({
  children,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-brand-soft hover:text-brand disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
