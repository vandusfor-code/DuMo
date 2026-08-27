"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  Copy,
  Check,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { EquipmentCatalogItem, EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";
import { validateEquipmentCatalogInput } from "@/lib/equipment-catalog";
import { EQUIPMENT_AI_IMPORT_PROMPT } from "@/lib/equipment-ai-prompt";
import { downloadEquipmentCatalogXlsx, EQUIPMENT_TEMPLATE_PATH } from "@/lib/equipment-import";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const EMPTY: UpsertEquipmentInput = {
  commercialName: "",
  brand: "",
  model: "",
  totalValue: 0,
  downPayment: 0,
  installmentsCount: 18,
  installmentValue: 0,
  commercialText: "",
  carrier: "wom",
  isPieCero: false,
  color: "",
  memory: "",
  promotions: "",
  observations: "",
  status: "active",
};

type FilterState = {
  brand: string;
  status: "all" | EquipmentStatus;
  pieCero: "all" | "yes" | "no";
};

const DEFAULT_FILTERS: FilterState = { brand: "all", status: "all", pieCero: "all" };

function matchesSearch(item: EquipmentCatalogItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    item.commercialName.toLowerCase().includes(q) ||
    item.brand.toLowerCase().includes(q) ||
    item.model.toLowerCase().includes(q)
  );
}

function matchesFilters(item: EquipmentCatalogItem, filters: FilterState): boolean {
  if (filters.brand !== "all" && item.brand !== filters.brand) return false;
  if (filters.status !== "all" && item.status !== filters.status) return false;
  if (filters.pieCero === "yes" && !item.isPieCero) return false;
  if (filters.pieCero === "no" && item.isPieCero) return false;
  return true;
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function EquipmentCatalogTable({
  items,
  onCreate,
  onImport,
  onEdit,
  onToggleStatus,
  onDelete,
  onDeleteAll,
  deletingAll,
}: {
  items: EquipmentCatalogItem[];
  onCreate: () => void;
  onImport: () => void;
  onEdit: (item: EquipmentCatalogItem) => void;
  onToggleStatus: (id: string, status: EquipmentStatus) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => Promise<void>;
  deletingAll?: boolean;
}) {
  const [promptCopied, setPromptCopied] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);

  const brands = useMemo(
    () => [...new Set(items.map((i) => i.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")),
    [items],
  );

  const filtered = useMemo(
    () => items.filter((item) => matchesSearch(item, search) && matchesFilters(item, filters)),
    [items, search, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filtered.length);

  const filtersActive =
    filters.brand !== "all" || filters.status !== "all" || filters.pieCero !== "all";

  const handleCopyAiPrompt = async () => {
    try {
      await navigator.clipboard.writeText(EQUIPMENT_AI_IMPORT_PROMPT);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setPromptCopied(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre comercial, marca o modelo..."
              className="h-10 w-full rounded-xl border border-line bg-card pl-10 pr-4 text-[14px] outline-none focus:border-brand/40"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className={filtersActive ? "border-brand text-brand" : ""}>
                  <SlidersHorizontal className="size-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Marca</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilters((f) => ({ ...f, brand: "all" }))}>
                  Todas {filters.brand === "all" ? "✓" : ""}
                </DropdownMenuItem>
                {brands.map((brand) => (
                  <DropdownMenuItem
                    key={brand}
                    onClick={() => setFilters((f) => ({ ...f, brand }))}
                  >
                    {brand} {filters.brand === brand ? "✓" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Estado</DropdownMenuLabel>
                {(
                  [
                    ["all", "Todos"],
                    ["active", "Activo"],
                    ["inactive", "Inactivo"],
                  ] as const
                ).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilters((f) => ({ ...f, status: value }))}
                  >
                    {label} {filters.status === value ? "✓" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Pie cero</DropdownMenuLabel>
                {(
                  [
                    ["all", "Todos"],
                    ["yes", "Sí"],
                    ["no", "No"],
                  ] as const
                ).map(([value, label]) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setFilters((f) => ({ ...f, pieCero: value }))}
                  >
                    {label} {filters.pieCero === value ? "✓" : ""}
                  </DropdownMenuItem>
                ))}
                {filtersActive ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilters(DEFAULT_FILTERS)}>
                      Limpiar filtros
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadEquipmentCatalogXlsx(items)}
              disabled={items.length === 0}
            >
              <Download className="size-4" />
              Descargar
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={EQUIPMENT_TEMPLATE_PATH} download>
                <Download className="size-4" />
                Descargar plantilla
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleCopyAiPrompt()}>
              {promptCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {promptCopied ? "Prompt copiado" : "Copiar prompt IA"}
            </Button>
            <Button size="sm" variant="outline" onClick={onImport}>
              <Upload className="size-4" />
              Cargar equipos
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-danger-ink hover:bg-danger-soft"
              disabled={items.length === 0 || deletingAll}
              onClick={() => {
                setDeleteAllError(null);
                setDeleteAllOpen(true);
              }}
            >
              {deletingAll ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Eliminar todo
            </Button>
            <Button size="sm" onClick={onCreate}>
              <Plus className="size-4" />
              Crear equipo
            </Button>
          </div>
        </div>

        <div className="px-4 pb-2 pt-3">
        <Table>
          <TableHeader>
            <TableRow className="border-0 bg-brand-soft hover:bg-brand-soft">
              {(
                [
                  "Nombre comercial",
                  "Marca",
                  "Modelo",
                  "Valor total",
                  "Pie",
                  "Pie cero",
                  "Cuotas",
                  "Valor cuota",
                  "Estado",
                ] as const
              ).map((label) => (
                <TableHead
                  key={label}
                  className="h-11 border-b border-brand/15 bg-brand-soft px-4 py-3 text-[12px] font-semibold text-brand"
                >
                  {label}
                </TableHead>
              ))}
              <TableHead className="h-11 w-12 border-b border-brand/15 bg-brand-soft px-4 py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-[14px] text-muted">
                  {items.length === 0
                    ? "No hay equipos en el catálogo. Crea uno o carga un archivo Excel."
                    : "Ningún equipo coincide con la búsqueda o filtros."}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold text-ink">{item.commercialName}</TableCell>
                  <TableCell>{item.brand}</TableCell>
                  <TableCell>{item.model}</TableCell>
                  <TableCell>{money.format(item.totalValue)}</TableCell>
                  <TableCell>{money.format(item.downPayment)}</TableCell>
                  <TableCell>
                    <PieCeroBadge enabled={item.isPieCero} />
                  </TableCell>
                  <TableCell>{item.installmentsCount}</TableCell>
                  <TableCell>{money.format(item.installmentValue)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="grid size-8 place-items-center rounded-lg hover:bg-canvas"
                        >
                          <MoreVertical className="size-4 text-muted" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Pencil className="size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            onToggleStatus(item.id, item.status === "active" ? "inactive" : "active")
                          }
                        >
                          {item.status === "active" ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-danger-ink">
                          <Trash2 className="size-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">
            Mostrando {rangeStart} a {rangeEnd} de {filtered.length} equipo
            {filtered.length === 1 ? "" : "s"}
            {filtered.length !== items.length ? ` (${items.length} en total)` : ""}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="size-9 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {pageNumbers(page, totalPages).map((p, idx) =>
              p === "ellipsis" ? (
                <span key={`e-${idx}`} className="px-2 text-muted">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? "primary" : "outline"}
                  className="min-w-9 px-2"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              size="sm"
              variant="outline"
              className="size-9 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {deleteAllOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-[17px] font-semibold text-ink">Eliminar todo el catálogo</h3>
            <p className="mt-2 text-[14px] text-muted">
              Esto eliminará los <strong className="text-ink">{items.length}</strong> equipos del
              catálogo. Esta acción no se puede deshacer. ¿Confirmas?
            </p>
            {deleteAllError ? (
              <p className="mt-3 text-[13px] text-danger-ink">{deleteAllError}</p>
            ) : null}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" disabled={deletingAll} onClick={() => setDeleteAllOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-danger-ink hover:bg-danger-ink/90"
                disabled={deletingAll}
                onClick={async () => {
                  setDeleteAllError(null);
                  try {
                    await onDeleteAll();
                    setDeleteAllOpen(false);
                  } catch (err) {
                    setDeleteAllError(err instanceof Error ? err.message : "No se pudo eliminar el catálogo.");
                  }
                }}
              >
                {deletingAll ? <Loader2 className="size-4 animate-spin" /> : null}
                Eliminar todo
              </Button>
            </div>
          </Card>
        </div>
      ) : null}
    </>
  );
}

function PieCeroBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        enabled ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink",
      )}
    >
      {enabled ? "Sí" : "No"}
    </span>
  );
}

function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        status === "active" ? "text-success-ink" : "text-muted",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" ? "bg-success-ink" : "bg-muted",
        )}
      />
      {status === "active" ? "Activo" : "Inactivo"}
    </span>
  );
}

export function EquipmentDialog({
  open,
  initial,
  defaultCarrier,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: EquipmentCatalogItem | null;
  defaultCarrier: string;
  onClose: () => void;
  onSave: (values: UpsertEquipmentInput) => void;
}) {
  const [values, setValues] = useState<UpsertEquipmentInput>(EMPTY);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValidationError(null);
      setValues(
        initial
          ? {
              commercialName: initial.commercialName,
              brand: initial.brand,
              model: initial.model,
              totalValue: initial.totalValue,
              downPayment: initial.downPayment,
              installmentsCount: initial.installmentsCount,
              installmentValue: initial.installmentValue,
              commercialText: initial.commercialText,
              carrier: initial.carrier ?? "wom",
              isPieCero: initial.isPieCero,
              color: initial.color ?? "",
              memory: initial.memory ?? "",
              promotions: initial.promotions ?? "",
              observations: initial.observations ?? "",
              status: initial.status,
            }
          : { ...EMPTY, carrier: defaultCarrier },
      );
    }
  }, [open, initial, defaultCarrier]);

  if (!open) return null;

  const field = (
    label: string,
    key: keyof UpsertEquipmentInput,
    type: "text" | "number" | "textarea" = "text",
  ) => (
    <label className="block">
      <span className="text-[13px] text-muted">{label}</span>
      {type === "textarea" ? (
        <textarea
          value={String(values[key] ?? "")}
          onChange={(e) => setValues({ ...values, [key]: e.target.value })}
          className="mt-1.5 min-h-[72px] w-full rounded-xl border border-line bg-card px-4 py-3 text-[14px] outline-none focus:border-brand/40"
        />
      ) : (
        <input
          type={type}
          value={values[key] as string | number}
          onChange={(e) =>
            setValues({
              ...values,
              [key]: type === "number" ? Number(e.target.value) : e.target.value,
            })
          }
          className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-4 text-[14px] outline-none focus:border-brand/40"
        />
      )}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <h3 className="text-[17px] font-semibold text-ink">
          {initial ? "Editar equipo" : "Nuevo equipo"}
        </h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {field("Nombre comercial", "commercialName")}
          <label className="block">
            <span className="text-[13px] text-muted">Operador</span>
            <select
              value={values.carrier}
              onChange={(e) => setValues({ ...values, carrier: e.target.value })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-4 text-[14px] outline-none focus:border-brand/40"
            >
              <option value="wom">WOM</option>
              <option value="claro">Claro</option>
            </select>
          </label>
          {field("Marca", "brand")}
          {field("Modelo", "model")}
          {field("Valor total ($)", "totalValue", "number")}
          {field("Valor del pie ($)", "downPayment", "number")}
          <label className="block sm:col-span-2">
            <span className="text-[13px] text-muted">¿Equipo con beneficio Pie Cero?</span>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setValues({ ...values, isPieCero: true })}
                className={cn(
                  "rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors",
                  values.isPieCero
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-card text-muted hover:bg-canvas",
                )}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setValues({ ...values, isPieCero: false })}
                className={cn(
                  "rounded-xl border px-4 py-2 text-[13px] font-medium transition-colors",
                  !values.isPieCero
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line bg-card text-muted hover:bg-canvas",
                )}
              >
                No
              </button>
            </div>
          </label>
          {field("Cantidad de cuotas", "installmentsCount", "number")}
          {field("Valor de cada cuota ($)", "installmentValue", "number")}
          <label className="block sm:col-span-2">
            <span className="text-[13px] text-muted">Texto comercial (para Asistente de Venta)</span>
            <textarea
              value={values.commercialText}
              onChange={(e) => setValues({ ...values, commercialText: e.target.value })}
              className="mt-1.5 min-h-[80px] w-full rounded-xl border border-line bg-card px-4 py-3 text-[14px] outline-none focus:border-brand/40"
              placeholder="Descripción oficial del equipo para el script..."
            />
          </label>
          {field("Color (opcional)", "color")}
          {field("Memoria (opcional)", "memory")}
          {field("Promociones (opcional)", "promotions")}
          <label className="block sm:col-span-2">
            <span className="text-[13px] text-muted">Observaciones (opcional)</span>
            <textarea
              value={values.observations ?? ""}
              onChange={(e) => setValues({ ...values, observations: e.target.value })}
              className="mt-1.5 min-h-[60px] w-full rounded-xl border border-line bg-card px-4 py-3 text-[14px] outline-none focus:border-brand/40"
            />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Estado</span>
            <select
              value={values.status}
              onChange={(e) => setValues({ ...values, status: e.target.value as EquipmentStatus })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-4 text-[14px] outline-none focus:border-brand/40"
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </label>
        </div>
        {validationError ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-[13px] text-danger-ink">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {validationError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              const error = validateEquipmentCatalogInput(values);
              if (error) {
                setValidationError(error);
                return;
              }
              setValidationError(null);
              onSave(values);
            }}
          >
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}
