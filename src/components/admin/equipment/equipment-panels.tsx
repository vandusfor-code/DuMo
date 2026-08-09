"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { EquipmentCatalogItem, EquipmentStatus, UpsertEquipmentInput } from "@/types/equipment";
import { validateEquipmentCatalogInput } from "@/lib/equipment-catalog";
import { EQUIPMENT_AI_IMPORT_PROMPT } from "@/lib/equipment-ai-prompt";
import { EQUIPMENT_TEMPLATE_PATH } from "@/lib/equipment-import";
import { cn } from "@/lib/utils";

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
  isPieCero: false,
  color: "",
  memory: "",
  promotions: "",
  observations: "",
  status: "active",
};

export function EquipmentCatalogTable({
  items,
  onCreate,
  onImport,
  onEdit,
  onToggleStatus,
  onDelete,
}: {
  items: EquipmentCatalogItem[];
  onCreate: () => void;
  onImport: () => void;
  onEdit: (item: EquipmentCatalogItem) => void;
  onToggleStatus: (id: string, status: EquipmentStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [promptCopied, setPromptCopied] = useState(false);

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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink">Catálogo de equipos</h3>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button size="sm" onClick={onCreate}>
            <Plus className="size-4" />
            Crear equipo
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre comercial</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Valor total</TableHead>
            <TableHead>Pie</TableHead>
            <TableHead>Pie cero</TableHead>
            <TableHead>Cuotas</TableHead>
            <TableHead>Valor cuota</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
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
                    <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
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
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function PieCeroBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        enabled ? "bg-brand-soft text-brand" : "bg-canvas text-muted",
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
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "active" ? "bg-success-soft text-success-ink" : "bg-canvas text-muted",
      )}
    >
      {status === "active" ? "Activo" : "Inactivo"}
    </span>
  );
}

export function EquipmentDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: EquipmentCatalogItem | null;
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
              isPieCero: initial.isPieCero,
              color: initial.color ?? "",
              memory: initial.memory ?? "",
              promotions: initial.promotions ?? "",
              observations: initial.observations ?? "",
              status: initial.status,
            }
          : { ...EMPTY },
      );
    }
  }, [open, initial]);

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
              <span
                className={cn(
                  "relative ml-1 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
                  values.isPieCero ? "bg-brand" : "bg-line",
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform",
                    values.isPieCero ? "translate-x-5" : "translate-x-0.5",
                  )}
                />
              </span>
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
