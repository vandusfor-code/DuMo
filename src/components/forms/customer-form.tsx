"use client";

import { useFormContext } from "react-hook-form";
import { IdCard, Phone, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, InputGroup } from "@/components/ui/input";
import { FormField } from "./form-field";
import type { NewSaleValues } from "@/lib/schemas/new-sale.schema";

/** "Información del cliente" card — three columns. */
export function CustomerForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<NewSaleValues>();

  return (
    <Card className="p-8">
      <h2 className="text-[18px] font-semibold text-brand">
        Información del cliente
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <FormField label="Nombre completo" htmlFor="customerName" error={errors.customerName?.message}>
          <InputGroup icon={<User />}>
            <Input
              id="customerName"
              className="pl-11"
              placeholder="Ej: Juan Sebastián Pérez"
              aria-invalid={!!errors.customerName}
              {...register("customerName")}
            />
          </InputGroup>
        </FormField>

        <FormField label="RUT" htmlFor="rut" error={errors.rut?.message}>
          <InputGroup icon={<IdCard />}>
            <Input
              id="rut"
              className="pl-11"
              placeholder="Ej: 10.123.456-7"
              aria-invalid={!!errors.rut}
              {...register("rut")}
            />
          </InputGroup>
        </FormField>

        <FormField label="Teléfono de contacto" htmlFor="phone" error={errors.phone?.message}>
          <InputGroup icon={<Phone />}>
            <Input
              id="phone"
              className="pl-11"
              placeholder="Ej: 300 123 4567"
              aria-invalid={!!errors.phone}
              {...register("phone")}
            />
          </InputGroup>
        </FormField>
      </div>
    </Card>
  );
}
