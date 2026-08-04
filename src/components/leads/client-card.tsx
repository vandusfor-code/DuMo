"use client";

import { useFormContext } from "react-hook-form";
import { IdCard, Phone, User } from "lucide-react";
import { Input, InputGroup } from "@/components/ui/input";
import { FormField } from "@/components/forms/form-field";
import type { LeadFormValues } from "@/types/lead-form";

/** Información del cliente. El teléfono viene del chat y es readOnly. */
export function ClientCard() {
  const {
    register,
    formState: { errors },
  } = useFormContext<LeadFormValues>();

  return (
    <div className="space-y-5">
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
    </div>
  );
}
