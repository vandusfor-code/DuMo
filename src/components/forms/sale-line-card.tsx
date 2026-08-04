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
import { FormField } from "./form-field";
import { SALE_TYPE_LABELS, DEVICE_REQUIRED_TYPES, type SaleType } from "@/types/sale";
import type { NewSaleValues } from "@/lib/schemas/new-sale.schema";

const SALE_TYPE_OPTIONS = Object.entries(SALE_TYPE_LABELS) as [SaleType, string][];

/** A single "Línea X" card with number, sale type and conditional device. */
export function SaleLineCard({
  index,
  onRemove,
  canRemove,
}: {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<NewSaleValues>();

  const saleType = useWatch({ control, name: `lines.${index}.saleType` });
  const requiresDevice = DEVICE_REQUIRED_TYPES.includes(saleType as SaleType);
  const lineErrors = errors.lines?.[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-canvas/40 p-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-brand">Línea {index + 1}</h3>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Eliminar línea ${index + 1}`}
            className="grid size-9 place-items-center rounded-lg border border-danger/20 text-danger-ink transition-colors hover:bg-danger-soft"
          >
            <Trash2 className="size-[17px]" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
        <FormField
          label="Número de línea"
          htmlFor={`lines.${index}.phoneNumber`}
          error={lineErrors?.phoneNumber?.message}
        >
          <InputGroup icon={<Phone />}>
            <Input
              id={`lines.${index}.phoneNumber`}
              className="pl-11"
              placeholder="Ej: 300 123 4567"
              aria-invalid={!!lineErrors?.phoneNumber}
              {...register(`lines.${index}.phoneNumber`)}
            />
          </InputGroup>
        </FormField>

        <FormField label="Tipo de venta" error={lineErrors?.saleType?.message}>
          <Controller
            control={control}
            name={`lines.${index}.saleType`}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger inputSize aria-invalid={!!lineErrors?.saleType}>
                  <SelectValue placeholder="Selecciona una opción" />
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

        <FormField
          label="Equipo"
          hint="(solo si aplica)"
          htmlFor={`lines.${index}.deviceName`}
          error={requiresDevice ? lineErrors?.deviceName?.message : undefined}
        >
          <InputGroup icon={<Smartphone />}>
            <Input
              id={`lines.${index}.deviceName`}
              className="pl-11"
              placeholder="Ej: Samsung Galaxy A54 5G"
              disabled={!requiresDevice}
              aria-invalid={requiresDevice && !!lineErrors?.deviceName}
              {...register(`lines.${index}.deviceName`)}
            />
          </InputGroup>
        </FormField>
      </div>
    </motion.div>
  );
}
