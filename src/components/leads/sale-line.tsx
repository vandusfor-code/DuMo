"use client";

import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { Input, InputGroup } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import { useActiveEquipment } from "@/hooks/use-equipment-catalog";
import { CHILE_REGIONS, comunasForRegion } from "@/data/chile-regions";
import { formatCurrency } from "@/lib/format";
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

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[13px] text-muted">{label}</span>
      <p className="mt-1.5 h-11 rounded-xl border border-line bg-card/80 px-4 py-2.5 text-[14px] font-medium text-ink">
        {value || "—"}
      </p>
    </div>
  );
}

function EquipmentInfoSection({ index }: { index: number }) {
  const { control, setValue, register } = useFormContext<LeadFormValues>();
  const catalogId = useWatch({ control, name: `lines.${index}.equipmentCatalogId` });
  const { data: equipmentList } = useActiveEquipment();

  const selected = equipmentList?.find((e) => e.id === catalogId);

  useEffect(() => {
    if (!selected) return;
    setValue(`lines.${index}.equipment`, selected.commercialName);
    setValue(`lines.${index}.equipmentModel`, `${selected.brand} ${selected.model}`.trim());
    setValue(`lines.${index}.equipmentValue`, String(selected.totalValue));
    setValue(`lines.${index}.equipmentDownPayment`, String(selected.downPayment));
    setValue(`lines.${index}.equipmentInstallments`, String(selected.installmentsCount));
    setValue(`lines.${index}.equipmentInstallmentValue`, String(selected.installmentValue));
    setValue(`lines.${index}.equipmentCommercialText`, selected.commercialText);
  }, [selected, index, setValue]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-4 rounded-xl border border-brand/20 bg-brand-soft/30 p-4">
        <h5 className="text-[13px] font-semibold text-brand">Información del equipo</h5>

        <div className="mt-3 space-y-4">
          <FormField label="Equipo">
            <Controller
              control={control}
              name={`lines.${index}.equipmentCatalogId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(equipmentList ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.commercialName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {selected ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReadOnlyValue label="Pie" value={formatCurrency(selected.downPayment)} />
              <ReadOnlyValue label="Cuotas" value={String(selected.installmentsCount)} />
              <ReadOnlyValue label="Valor cuota" value={formatCurrency(selected.installmentValue)} />
              <ReadOnlyValue label="Valor total" value={formatCurrency(selected.totalValue)} />
            </div>
          ) : null}
        </div>

        <input type="hidden" {...register(`lines.${index}.equipment`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentModel`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentValue`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentDownPayment`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentInstallments`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentInstallmentValue`)} />
        <input type="hidden" {...register(`lines.${index}.equipmentCommercialText`)} />
      </div>
    </motion.div>
  );
}

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
  const { control, register, setValue } = useFormContext<LeadFormValues>();
  const saleType = useWatch({ control, name: `lines.${index}.saleType` });
  const equipmentMode = useWatch({ control, name: `lines.${index}.equipmentMode` });
  const region = useWatch({ control, name: `lines.${index}.region` });
  const isPortability = saleType === "portability";
  const withEquipment = equipmentMode === "with";
  const comunas = region ? comunasForRegion(region) : [];

  useEffect(() => {
    if (!region) return;
    setValue(`lines.${index}.comuna`, "");
  }, [region, index, setValue]);

  useEffect(() => {
    if (equipmentMode !== "with") {
      setValue(`lines.${index}.equipmentCatalogId`, "");
      setValue(`lines.${index}.equipment`, "");
      setValue(`lines.${index}.equipmentModel`, "");
      setValue(`lines.${index}.equipmentValue`, "");
      setValue(`lines.${index}.equipmentDownPayment`, "");
      setValue(`lines.${index}.equipmentInstallments`, "");
      setValue(`lines.${index}.equipmentInstallmentValue`, "");
      setValue(`lines.${index}.equipmentCommercialText`, "");
    }
  }, [equipmentMode, index, setValue]);

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
                          ? `${p.name} — ${formatCurrency(p.womValue)}`
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

        <FormField label="Dirección de despacho" htmlFor={`line-${index}-delivery-address`}>
          <InputGroup icon={<MapPin />}>
            <Input
              id={`line-${index}-delivery-address`}
              className="h-11 pl-11 text-[14px]"
              placeholder="Dirección donde se enviará la SIM o el equipo"
              {...register(`lines.${index}.deliveryAddress`)}
            />
          </InputGroup>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Región">
            <Controller
              control={control}
              name={`lines.${index}.region`}
              rules={{ required: "Selecciona una región." }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHILE_REGIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Comuna">
            <Controller
              control={control}
              name={`lines.${index}.comuna`}
              rules={{ required: "Selecciona una comuna." }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!region}
                >
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder={region ? "Selecciona" : "Primero elige región"} />
                  </SelectTrigger>
                  <SelectContent>
                    {comunas.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
        </div>

        {withEquipment ? <EquipmentInfoSection index={index} /> : null}
      </div>
    </motion.div>
  );
}
