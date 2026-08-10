"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  computeDefaultFollowUpDate,
  getFollowUpDateUiConfig,
} from "@/lib/tipification-follow-up";
import { useTipificationCatalog } from "@/hooks/use-tipification-catalog";
import type { LeadFormValues } from "@/types/lead-form";

export function FollowUpDateField() {
  const { catalog } = useTipificationCatalog();
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = useFormContext<LeadFormValues>();
  const type = useWatch({ control, name: "type" });

  const config = getFollowUpDateUiConfig(type, catalog);

  useEffect(() => {
    if (!config.showField) {
      setValue("followUpDate", "", { shouldDirty: false, shouldValidate: false });
      return;
    }
    if (config.uiMode === "manual_suggested" && config.suggestedDefaultDays != null) {
      setValue("followUpDate", computeDefaultFollowUpDate(config.suggestedDefaultDays), {
        shouldDirty: false,
        shouldValidate: false,
      });
      return;
    }
    if (config.uiMode === "manual") {
      setValue("followUpDate", "", { shouldDirty: false, shouldValidate: false });
    }
  }, [type, config.showField, config.uiMode, config.suggestedDefaultDays, setValue]);

  if (!config.showField) return null;

  const hint =
    config.uiMode === "manual_suggested"
      ? "Sugerida +7 días — ajusta si el cliente indicó otra fecha."
      : "Fecha real acordada con el cliente.";

  return (
    <div className="space-y-2">
      <Label htmlFor="lead-follow-up-date" className="flex items-center gap-1.5">
        Fecha de seguimiento
        <span className="font-normal text-danger">*</span>
      </Label>
      <Input
        id="lead-follow-up-date"
        type="date"
        className="h-11 text-[14px]"
        {...register("followUpDate", {
          required: config.required ? "La fecha de seguimiento es obligatoria." : false,
        })}
      />
      <p className="text-[12px] text-muted">{hint}</p>
      {errors.followUpDate?.message ? (
        <p className="text-[12px] text-danger">{String(errors.followUpDate.message)}</p>
      ) : null}
    </div>
  );
}
