import { z } from "zod";
import { DEVICE_REQUIRED_TYPES } from "@/types/sale";

export const saleTypeSchema = z.enum([
  "portability",
  "portability_device",
  "device_renewal",
  "new_line",
  "migration",
]);

export const saleLineSchema = z
  .object({
    phoneNumber: z.string().trim().min(1, "El número de línea es obligatorio."),
    saleType: saleTypeSchema,
    deviceName: z.string().trim().optional().default(""),
  })
  .superRefine((line, ctx) => {
    const requiresDevice = DEVICE_REQUIRED_TYPES.includes(line.saleType);
    if (requiresDevice && !line.deviceName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deviceName"],
        message: "El equipo es obligatorio para este tipo de venta.",
      });
    }
  });

export const newSaleSchema = z.object({
  customerName: z.string().trim().min(1, "El nombre es obligatorio."),
  rut: z.string().trim().min(1, "El RUT es obligatorio."),
  phone: z.string().trim().min(1, "El teléfono es obligatorio."),
  email: z.string().trim().email("Correo inválido.").optional().or(z.literal("")),
  notes: z.string().trim().max(300, "Máximo 300 caracteres.").optional().default(""),
  lines: z.array(saleLineSchema).min(1, "Agrega al menos una línea."),
});

export type NewSaleValues = z.infer<typeof newSaleSchema>;
