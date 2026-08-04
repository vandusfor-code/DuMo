"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { NewSaleValues } from "@/lib/schemas/new-sale.schema";

const MAX = 300;

/** Observaciones textarea with a live character counter. */
export function NotesField() {
  const { register, control } = useFormContext<NewSaleValues>();
  const value = useWatch({ control, name: "notes" }) ?? "";

  return (
    <div className="space-y-2">
      <Label htmlFor="notes" className="flex items-center gap-1.5">
        Observaciones <span className="font-normal text-muted">(opcional)</span>
      </Label>
      <Textarea
        id="notes"
        maxLength={MAX}
        className="h-[160px]"
        placeholder="Escribe aquí cualquier observación relevante sobre la venta..."
        {...register("notes")}
      />
      <div className="text-right text-[12px] text-muted">
        {value.length}/{MAX}
      </div>
    </div>
  );
}
