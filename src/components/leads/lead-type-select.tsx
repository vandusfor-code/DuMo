"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { LEAD_TYPE_LABELS, type LeadType } from "@/types/lead";
import type { LeadFormValues } from "@/types/lead-form";

const OPTIONS = Object.entries(LEAD_TYPE_LABELS) as [LeadType, string][];

export function LeadTypeSelect() {
  const { control } = useFormContext<LeadFormValues>();

  return (
    <FormField label="Tipo de gestión">
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger inputSize>
              <span className="flex items-center gap-2">
                <Tag className="size-[18px] text-brand" />
                <SelectValue placeholder="Selecciona una opción" />
              </span>
            </SelectTrigger>
            <SelectContent>
              {OPTIONS.map(([value, label]) => (
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
