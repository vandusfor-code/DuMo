"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";
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
import type { AdminPendientesDateRange } from "@/types/admin-pendientes";

export interface PendientesAppliedFilters {
  search: string;
  type: string;
  advisor: string;
  dateRange: AdminPendientesDateRange;
}

export const EMPTY_PENDIENTES_FILTERS: PendientesAppliedFilters = {
  search: "",
  type: "all",
  advisor: "all",
  dateRange: "all",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted">{label}</label>
      {children}
    </div>
  );
}

export function AdminPendientesFilters({
  advisors,
  tipificationOptions,
  onApply,
  onClear,
}: {
  advisors: { id: string; name: string }[];
  tipificationOptions: { slug: string; name: string }[];
  onApply: (f: PendientesAppliedFilters) => void;
  onClear: () => void;
}) {
  const [draft, setDraft] = useState<PendientesAppliedFilters>(EMPTY_PENDIENTES_FILTERS);
  const set = (patch: Partial<PendientesAppliedFilters>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Filter className="size-[18px] text-muted" />
          Filtros
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClear}>
            Limpiar
          </Button>
          <Button onClick={() => onApply(draft)}>Aplicar</Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Buscar">
          <InputGroup icon={<Search className="size-4 text-muted" />}>
            <Input
              placeholder="Nombre, teléfono o nota…"
              value={draft.search}
              onChange={(e) => set({ search: e.target.value })}
            />
          </InputGroup>
        </Field>
        <Field label="Tipo de pendiente">
          <Select value={draft.type} onValueChange={(v) => set({ type: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {tipificationOptions.map((t) => (
                <SelectItem key={t.slug} value={t.slug}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Asesora">
          <Select value={draft.advisor} onValueChange={(v) => set({ advisor: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {advisors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Fecha programada">
          <Select
            value={draft.dateRange}
            onValueChange={(v) => set({ dateRange: v as AdminPendientesDateRange })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="next7">Próximos 7 días</SelectItem>
              <SelectItem value="next30">Próximos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Card>
  );
}
