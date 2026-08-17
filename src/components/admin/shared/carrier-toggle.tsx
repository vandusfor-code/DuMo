"use client";

import { Radio } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CARRIER_LABELS: Record<string, string> = {
  wom: "WOM",
  claro: "Claro",
};

/**
 * Interruptor de contexto WOM/Claro para pantallas de admin — filtra la
 * lista visible y define el operador por defecto al crear un ítem nuevo.
 * A diferencia de src/components/leads/carrier-select.tsx, no depende de
 * react-hook-form: value/onChange plano, para usar como filtro de página.
 */
export function CarrierToggle({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (carrier: string) => void;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className ?? "h-10 w-[140px]"} aria-label="Operador">
        <span className="flex items-center gap-2">
          <Radio className="size-4 text-brand" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(CARRIER_LABELS).map(([carrier, label]) => (
          <SelectItem key={carrier} value={carrier}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
