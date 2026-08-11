"use client";

import { useEffect, useRef } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/forms/form-field";
import {
  SectionCard,
  SectionCardBody,
  SectionCardHeader,
} from "@/components/leads/premium/section-card";
import { CHILE_REGIONS, comunasForRegion } from "@/data/chile-regions";
import {
  CURRENT_OPERATOR_LABELS,
  DELIVERY_TYPE_LABELS,
  LEAD_SALE_TYPE_LABELS,
  type CurrentOperator,
  type DeliveryType,
  type LeadSaleType,
} from "@/types/lead";
import type { LeadFormValues } from "@/types/lead-form";

const OPERATOR_OPTIONS = Object.entries(CURRENT_OPERATOR_LABELS) as [CurrentOperator, string][];
const SALE_TYPE_OPTIONS = Object.entries(LEAD_SALE_TYPE_LABELS) as [LeadSaleType, string][];
const DELIVERY_OPTIONS = Object.entries(DELIVERY_TYPE_LABELS) as [DeliveryType, string][];

/**
 * Formulario de Operación Duo — se muestra en vez de "Líneas vendidas" cuando
 * la tipificación seleccionada tiene `opensCustomForm`. Al guardar y cerrar,
 * estos datos crean la fila en `duo_sales` (cola paralela, no una venta).
 * Nombre completo/RUT/teléfono ya se capturan en "Información general".
 */
export function DuoSaleForm() {
  const { control, register, setValue } = useFormContext<LeadFormValues>();
  const region = useWatch({ control, name: "duo.region" });
  const comments = useWatch({ control, name: "duo.comments" }) ?? "";
  const comunas = region ? comunasForRegion(region) : [];
  const prevRegion = useRef(region);

  useEffect(() => {
    if (prevRegion.current !== region) {
      prevRegion.current = region;
      setValue("duo.comuna", "");
    }
  }, [region, setValue]);

  return (
    <SectionCard>
      <SectionCardHeader
        title="Operación Duo"
        subtitle="Otra asesora cerrará esta venta por llamada. Completa los datos para que pueda contactar al cliente."
      />
      <SectionCardBody className="space-y-4 pt-0">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Operador actual">
            <Controller
              control={control}
              name="duo.currentCompany"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona un operador" />
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

          <FormField label="Correo">
            <Input
              type="email"
              className="h-11 text-[14px]"
              placeholder="cliente@correo.com"
              {...register("duo.email")}
            />
          </FormField>

          <FormField label="Región">
            <Controller
              control={control}
              name="duo.region"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona región" />
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
              name="duo.comuna"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!region}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder={region ? "Selecciona comuna" : "Elige región primero"} />
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

          <FormField label="Calle">
            <Input
              className="h-11 text-[14px]"
              placeholder="Nombre de la calle"
              {...register("duo.street")}
            />
          </FormField>

          <FormField label="Número">
            <Input
              className="h-11 text-[14px]"
              placeholder="N°, depto/casa"
              {...register("duo.houseNumber")}
            />
          </FormField>

          <FormField label="Plan">
            <Input
              className="h-11 text-[14px]"
              placeholder="Ej. Plan Control 45GB"
              {...register("duo.plan")}
            />
          </FormField>

          <FormField label="Equipo" hint="(si aplica)">
            <Input
              className="h-11 text-[14px]"
              placeholder="Ej. Sin equipo"
              {...register("duo.equipment")}
            />
          </FormField>

          <FormField label="Tipo de venta">
            <Controller
              control={control}
              name="duo.saleType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona tipo" />
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

          <FormField label="Tipo de entrega">
            <Controller
              control={control}
              name="duo.dispatch"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11 text-[14px]">
                    <SelectValue placeholder="Selecciona entrega" />
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

          <FormField label="Número registrado en DuMo">
            <Input
              type="tel"
              className="h-11 text-[14px]"
              placeholder="Número con el que quedará registrado en DuMo"
              {...register("duo.dumoRegisteredName")}
            />
          </FormField>

          <FormField label="Horario preferido de llamada">
            <Input
              className="h-11 text-[14px]"
              placeholder="Ej. Hoy después de las 3pm"
              {...register("duo.callTime")}
            />
          </FormField>
        </div>

        <FormField label="Comentarios">
          <Textarea
            maxLength={500}
            className="h-[100px] text-[14px]"
            placeholder="Contexto para la asesora que cierre la llamada..."
            {...register("duo.comments")}
          />
          <div className="text-right text-[12px] text-muted">{comments.length}/500</div>
        </FormField>
      </SectionCardBody>
    </SectionCard>
  );
}
