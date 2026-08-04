"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Phone, Smartphone, Trash2 } from "lucide-react";
import { Input, InputGroup } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import {
  EQUIPMENT_LEAD_TYPES,
  LEAD_SALE_TYPE_LABELS,
  type LeadSaleType,
  type Plan,
} from "@/types/lead";
import type { LeadFormValues } from "@/types/lead-form";

const SALE_TYPE_OPTIONS = Object.entries(LEAD_SALE_TYPE_LABELS) as [LeadSaleType, string][];

export function SaleLine({
  index,
  plans,
  canRemove,
  onRemove,
}: {
  index: number;
  plans: Plan[];
  canRemove: boolean;
  onRemove: () => void;
}) {
  const { control, register } = useFormContext<LeadFormValues>();
  const saleType = useWatch({ control, name: `lines.${index}.saleType` });
  const showEquipment = EQUIPMENT_LEAD_TYPES.includes(saleType as LeadSaleType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-canvas/50 p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[14px] font-semibold text-brand">Línea {index + 1}</h4>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar línea ${index + 1}`}
            className="grid size-8 place-items-center rounded-lg text-danger-ink transition-colors hover:bg-danger-soft"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-4">
        <FormField label="Número de línea" htmlFor={`line-${index}-phone`}>
          <InputGroup icon={<Phone />}>
            <Input
              id={`line-${index}-phone`}
              className="h-11 pl-11 text-[14px]"
              placeholder="Ej: 300 123 4567"
              {...register(`lines.${index}.phone`)}
            />
          </InputGroup>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Tipo de venta">
            <Controller
              control={control}
              name={`lines.${index}.saleType`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_TYPE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Tipo de plan">
            <Controller
              control={control}
              name={`lines.${index}.planId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        {showEquipment && (
          <FormField label="Equipo" hint="(solo si aplica)" htmlFor={`line-${index}-eq`}>
            <InputGroup icon={<Smartphone />}>
              <Input
                id={`line-${index}-eq`}
                className="h-11 pl-11 text-[14px]"
                placeholder="Ej: Samsung Galaxy A54 5G"
                {...register(`lines.${index}.equipment`)}
              />
            </InputGroup>
          </FormField>
        )}
      </div>
    </motion.div>
  );
}
