"use client";

import { useState } from "react";
import { Download, Filter, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, InputGroup } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_SALE_STATUS_LABELS,
  ADMIN_SALE_TYPE_LABELS,
  type AdminSaleStatus,
  type AdminSaleType,
} from "@/types/admin-sale";

export interface AppliedFilters {
  search: string;
  status: AdminSaleStatus | "all";
  advisor: string | "all";
  type: AdminSaleType | "all";
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: AppliedFilters = {
  search: "",
  status: "all",
  advisor: "all",
  type: "all",
  dateFrom: "",
  dateTo: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export function AdminSalesFilters({
  advisors,
  onApply,
  onClear,
}: {
  advisors: { id: string; name: string }[];
  onApply: (f: AppliedFilters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<AppliedFilters>(EMPTY_FILTERS);
  const set = (patch: Partial<AppliedFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Filter className="size-[18px] text-muted" />
          Filtros
        </h3>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="default" disabled title="Próximamente">
            <Download className="size-[18px]" />
            Exportar
          </Button>
          <Button size="default" disabled title="Próximamente">
            <Plus className="size-[18px]" />
            Nueva venta
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Field label="Buscar">
          <InputGroup icon={<Search />}>
            <Input
              className="h-11 pl-11 text-[14px]"
              placeholder="Cliente, RUT, ID venta, plan..."
              value={draft.search}
              onChange={(e) => set({ search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onApply(draft)}
            />
          </InputGroup>
        </Field>

        <Field label="Fecha desde">
          <Input
            type="date"
            value={draft.dateFrom}
            onChange={(e) => set({ dateFrom: e.target.value })}
            className="h-11 text-[14px]"
          />
        </Field>
        <Field label="Fecha hasta">
          <Input
            type="date"
            value={draft.dateTo}
            onChange={(e) => set({ dateTo: e.target.value })}
            className="h-11 text-[14px]"
          />
        </Field>

        <Field label="Estado">
          <Select value={draft.status} onValueChange={(v) => set({ status: v as AppliedFilters["status"] })}>
            <SelectTrigger className="h-11 text-[14px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {(Object.keys(ADMIN_SALE_STATUS_LABELS) as AdminSaleStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{ADMIN_SALE_STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Asesora">
          <Select value={draft.advisor} onValueChange={(v) => set({ advisor: v })}>
            <SelectTrigger className="h-11 text-[14px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las asesoras</SelectItem>
              {advisors.map((a) => (
                <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tipo de venta">
          <Select value={draft.type} onValueChange={(v) => set({ type: v as AppliedFilters["type"] })}>
            <SelectTrigger className="h-11 text-[14px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {(Object.keys(ADMIN_SALE_TYPE_LABELS) as AdminSaleType[]).map((tp) => (
                <SelectItem key={tp} value={tp}>{ADMIN_SALE_TYPE_LABELS[tp]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="secondary"
          onClick={() => {
            setDraft(EMPTY_FILTERS);
            onClear();
          }}
        >
          Limpiar
        </Button>
        <Button onClick={() => onApply(draft)}>
          <Filter className="size-[18px]" />
          Filtrar
        </Button>
      </div>
    </Card>
  );
}
