"use client";

import { useState } from "react";
import {
  Copy,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
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
import {
  COMMERCIAL_SALE_TYPE_LABELS,
  type CommercialPlan,
  type CommercialPlanStatus,
} from "@/types/commercial-config";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export function CommercialPlansTable({
  plans,
  onEdit,
  onDuplicate,
  onDelete,
  onCreate,
}: {
  plans: CommercialPlan[];
  onEdit: (plan: CommercialPlan) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold text-ink">Planes comerciales</h3>
        <Button size="sm" onClick={onCreate}>
          <Plus className="size-4" />
          Crear plan
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre plan</TableHead>
            <TableHead>Operador</TableHead>
            <TableHead>Tipo venta</TableHead>
            <TableHead>Valor Wom</TableHead>
            <TableHead>Valor DuMo</TableHead>
            <TableHead>Comisión asesora</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-semibold text-ink">{p.name}</TableCell>
              <TableCell>{p.operator}</TableCell>
              <TableCell>{COMMERCIAL_SALE_TYPE_LABELS[p.saleType]}</TableCell>
              <TableCell>{money.format(p.womValue)}</TableCell>
              <TableCell>{money.format(p.dumoValue)}</TableCell>
              <TableCell>{money.format(p.advisorCommission)}</TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="grid size-8 place-items-center rounded-lg hover:bg-canvas">
                      <MoreVertical className="size-4 text-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(p)}>
                      <Pencil className="size-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(p.id)}>
                      <Copy className="size-4" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(p.id)} className="text-danger-ink">
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

function StatusBadge({ status }: { status: CommercialPlanStatus }) {
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

export function CommercialSettingsForm({
  settings,
  onSave,
  isSaving,
}: {
  settings: {
    monthlyGoal: number;
    profitGoal: number;
    baseCommission: number;
    specialBonus: number;
    campaignCommission: number;
  };
  onSave: (values: typeof settings) => void;
  isSaving: boolean;
}) {
  const [values, setValues] = useState(settings);

  const fields = [
    { key: "monthlyGoal" as const, label: "Meta mensual" },
    { key: "profitGoal" as const, label: "Meta utilidad" },
    { key: "baseCommission" as const, label: "Comisión base" },
    { key: "specialBonus" as const, label: "Bonificación especial" },
    { key: "campaignCommission" as const, label: "Comisión por campaña" },
  ];

  return (
    <Card className="p-5">
      <h3 className="text-[15px] font-semibold text-ink">Configuraciones adicionales</h3>
      <p className="mt-1 text-[13px] text-muted">
        Estos valores alimentan todos los cálculos del sistema.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="text-[13px] text-muted">{f.label}</span>
            <input
              type="number"
              value={values[f.key]}
              onChange={(e) => setValues({ ...values, [f.key]: Number(e.target.value) })}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-card px-4 text-[14px] outline-none focus:border-brand/40"
            />
          </label>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={() => onSave(values)} disabled={isSaving}>
          Guardar configuración
        </Button>
      </div>
    </Card>
  );
}

export function CommercialPlanDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial?: CommercialPlan | null;
  onClose: () => void;
  onSave: (values: Omit<CommercialPlan, "id">) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [operator, setOperator] = useState(initial?.operator ?? "");
  const [saleType, setSaleType] = useState(initial?.saleType ?? "portabilidad");
  const [womValue, setWomValue] = useState(initial?.womValue ?? 0);
  const [dumoValue, setDumoValue] = useState(initial?.dumoValue ?? 0);
  const [advisorCommission, setAdvisorCommission] = useState(initial?.advisorCommission ?? 0);
  const [status, setStatus] = useState<CommercialPlanStatus>(initial?.status ?? "active");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <Card className="w-full max-w-lg p-6">
        <h3 className="text-[17px] font-semibold text-ink">
          {initial ? "Editar plan" : "Crear plan"}
        </h3>
        <div className="mt-4 space-y-3">
          <input placeholder="Nombre plan" value={name} onChange={(e) => setName(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <input placeholder="Operador" value={operator} onChange={(e) => setOperator(e.target.value)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          <select value={saleType} onChange={(e) => setSaleType(e.target.value as CommercialPlan["saleType"])} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]">
            {Object.entries(COMMERCIAL_SALE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <label className="block">
            <span className="text-[13px] text-muted">Valor Wom (precio al cliente)</span>
            <input type="number" value={womValue} onChange={(e) => setWomValue(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Valor DuMo (pago WOM → DuMo, solo admin)</span>
            <input type="number" value={dumoValue} onChange={(e) => setDumoValue(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <label className="block">
            <span className="text-[13px] text-muted">Comisión asesora</span>
            <input type="number" value={advisorCommission} onChange={(e) => setAdvisorCommission(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-line px-4 text-[14px]" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as CommercialPlanStatus)} className="h-11 w-full rounded-xl border border-line px-4 text-[14px]">
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onSave({ name, operator, saleType, womValue, dumoValue, advisorCommission, status }); onClose(); }}>
            Guardar
          </Button>
        </div>
      </Card>
    </div>
  );
}
