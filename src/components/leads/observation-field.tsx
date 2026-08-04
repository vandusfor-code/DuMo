"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { LeadFormValues } from "@/types/lead-form";

/** Reusable textarea with a live character counter (bound to a form field). */
export function ObservationField({
  name,
  label,
  hint,
  placeholder,
  max = 500,
}: {
  name: "observations" | "internalNotes";
  label: string;
  hint?: string;
  placeholder: string;
  max?: number;
}) {
  const { register, control } = useFormContext<LeadFormValues>();
  const value = useWatch({ control, name }) ?? "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`lead-${name}`} className="flex items-center gap-1.5">
        {label}
        {hint && <span className="font-normal text-muted">{hint}</span>}
      </Label>
      <Textarea
        id={`lead-${name}`}
        maxLength={max}
        className="h-[120px] text-[14px]"
        placeholder={placeholder}
        {...register(name)}
      />
      <div className="text-right text-[12px] text-muted">
        {value.length}/{max}
      </div>
    </div>
  );
}
