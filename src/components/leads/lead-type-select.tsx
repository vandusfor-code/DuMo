"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Loader2, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { useTipificationCatalog } from "@/hooks/use-tipification-catalog";
import type { LeadFormValues } from "@/types/lead-form";

export function LeadTypeSelect() {
  const { control } = useFormContext<LeadFormValues>();
  const { options, isLoading, usingFallback } = useTipificationCatalog();

  return (
    <FormField label="Tipificación">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger inputSize>
              <span className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="size-[18px] animate-spin text-muted" />
                ) : (
                  <Tag className="size-[18px] text-brand" />
                )}
                <SelectValue placeholder="Selecciona una tipificación" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {usingFallback ? (
        <p className="mt-1.5 text-[12px] text-muted">
          Mostrando tipificaciones de respaldo. La lista se actualizará cuando la conexión se
          restablezca.
        </p>
      ) : null}
    </FormField>
  );
}
