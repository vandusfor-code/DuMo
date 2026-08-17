"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Radio } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { NEW_LEAD_TIPIFICATION_SLUG } from "@/lib/tipification-system";
import type { LeadFormValues } from "@/types/lead-form";

const CARRIER_LABELS: Record<string, string> = {
  wom: "WOM",
  claro: "Claro",
};

/**
 * Operador de la venta (WOM/Claro). Arranca con el operador detectado en la
 * conversación pero es editable — cubre el caso de cruce (cliente llega por
 * el número de un operador y se le vende el otro). Cambiarlo filtra en vivo
 * el catálogo de tipificaciones de LeadTypeSelect; por eso resetea `type` a
 * la tipificación por defecto, ya que la elegida puede no aplicar al nuevo operador.
 */
export function CarrierSelect() {
  const { control, setValue } = useFormContext<LeadFormValues>();

  return (
    <FormField label="Operador">
      <Controller
        control={control}
        name="carrier"
        render={({ field }) => (
          <Select
            value={field.value}
            onValueChange={(carrier) => {
              field.onChange(carrier);
              setValue("type", NEW_LEAD_TIPIFICATION_SLUG);
            }}
          >
            <SelectTrigger inputSize>
              <span className="flex items-center gap-2">
                <Radio className="size-[18px] text-brand" />
                <SelectValue placeholder="Selecciona un operador" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CARRIER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FormField>
  );
}
