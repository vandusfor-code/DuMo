"use client";

import { useFormContext } from "react-hook-form";
import { IdCard, Phone, User } from "lucide-react";
import { Input, InputGroup } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import type { LeadFormValues } from "@/types/lead-form";

/** Nombre y RUT editables — alimentan el guardado y el script de venta. */
export function ClientIdentityFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<LeadFormValues>();

  return (
    <div className="space-y-4">
      <FormField label="Nombre completo" htmlFor="lead-name" error={errors.customerName?.message}>
        <InputGroup icon={<User />}>
          <Input
            id="lead-name"
            className="h-11 pl-11 text-[14px]"
            placeholder="Nombre del cliente"
            aria-invalid={!!errors.customerName}
            {...register("customerName", { required: "El nombre es obligatorio." })}
          />
        </InputGroup>
      </FormField>

      <FormField label="RUT" htmlFor="lead-rut" error={errors.rut?.message}>
        <InputGroup icon={<IdCard />}>
          <Input
            id="lead-rut"
            className="h-11 pl-11 text-[14px]"
            placeholder="Ej: 10.123.456-7"
            aria-invalid={!!errors.rut}
            {...register("rut", { required: "El RUT es obligatorio." })}
          />
        </InputGroup>
      </FormField>
    </div>
  );
}

export function ClientPhoneField() {
  const { register } = useFormContext<LeadFormValues>();

  return (
    <FormField label="Teléfono de contacto" htmlFor="lead-phone" hint="(desde el chat)">
      <InputGroup icon={<Phone />}>
        <Input
          id="lead-phone"
          readOnly
          className="h-11 cursor-not-allowed bg-canvas pl-11 text-[14px] text-muted"
          {...register("phone")}
        />
      </InputGroup>
    </FormField>
  );
}

/** Información del cliente (pestaña admin u otros flujos completos). */
export function ClientCard() {
  return (
    <div className="space-y-5">
      <ClientIdentityFields />
      <ClientPhoneField />
    </div>
  );
}
