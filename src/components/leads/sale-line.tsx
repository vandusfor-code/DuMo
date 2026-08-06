"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Mail, Phone, Trash2 } from "lucide-react";
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
  CURRENT_OPERATOR_LABELS,
  DELIVERY_TYPE_LABELS,
  EQUIPMENT_MODE_LABELS,
  LEAD_SALE_TYPE_LABELS,
  type CurrentOperator,
  type DeliveryType,
  type EquipmentMode,
  type LeadSaleType,
  type Plan,
} from "@/types/lead";
import type { LeadFormValues } from "@/types/lead-form";

const SALE_TYPE_OPTIONS = Object.entries(LEAD_SALE_TYPE_LABELS) as [LeadSaleType, string][];
const EQUIPMENT_MODE_OPTIONS = Object.entries(EQUIPMENT_MODE_LABELS) as [EquipmentMode, string][];
const OPERATOR_OPTIONS = Object.entries(CURRENT_OPERATOR_LABELS) as [CurrentOperator, string][];
const DELIVERY_OPTIONS = Object.entries(DELIVERY_TYPE_LABELS) as [DeliveryType, string][];

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
  const equipmentMode = useWatch({ control, name: `lines.${index}.equipmentMode` });
  const isPortability = saleType === "portability";
  const withEquipment = equipmentMode === "with";

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
                        {p.womValue
                          ? `${p.name} — ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(p.womValue)}`
                          : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Equipo">
            <Controller
              control={control}
              name={`lines.${index}.equipmentMode`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_MODE_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {isPortability ? (
            <FormField label="Operador actual">
              <Controller
                control={control}
                name={`lines.${index}.currentOperator`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 text-[14px]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          ) : (
            <FormField label="Tipo de entrega">
              <Controller
                control={control}
                name={`lines.${index}.deliveryType`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 text-[14px]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
        </div>

        {isPortability ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tipo de entrega">
              <Controller
                control={control}
                name={`lines.${index}.deliveryType`}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-11 text-[14px]">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERY_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Correo electrónico" htmlFor={`line-${index}-email`}>
              <InputGroup icon={<Mail />}>
                <Input
                  id={`line-${index}-email`}
                  type="email"
                  className="h-11 pl-11 text-[14px]"
                  placeholder="Ej: cliente@correo.com"
                  autoComplete="email"
                  {...register(`lines.${index}.email`)}
                />
              </InputGroup>
            </FormField>
          </div>
        ) : (
          <FormField label="Correo electrónico" htmlFor={`line-${index}-email`}>
            <InputGroup icon={<Mail />}>
              <Input
                id={`line-${index}-email`}
                type="email"
                className="h-11 pl-11 text-[14px]"
                placeholder="Ej: cliente@correo.com"
                autoComplete="email"
                {...register(`lines.${index}.email`)}
              />
            </InputGroup>
          </FormField>
        )}

        {withEquipment ? (
          <div className="hidden" aria-hidden="true">
            <input type="hidden" {...register(`lines.${index}.equipmentModel`)} />
            <input type="hidden" {...register(`lines.${index}.equipmentValue`)} />
            <input type="hidden" {...register(`lines.${index}.equipmentDownPayment`)} />
            <input type="hidden" {...register(`lines.${index}.equipmentInstallments`)} />
            <input type="hidden" {...register(`lines.${index}.equipment`)} />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
