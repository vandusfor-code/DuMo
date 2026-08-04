import { z } from "zod";

export const leadTypeSchema = z.enum([
  "venta",
  "consulta",
  "seguimiento",
  "no_interesado",
  "pendiente",
  "reagenda",
  "informacion",
  "otro",
]);

export const leadSaleTypeSchema = z.enum([
  "portability",
  "renewal",
  "migration",
  "new_line",
]);

export const leadLineSchema = z.object({
  phone: z.string().trim().min(1, "El número de línea es obligatorio."),
  saleType: leadSaleTypeSchema,
  planId: z.string().trim().min(1, "Selecciona un plan."),
  equipment: z.string().trim().optional().default(""),
});

export const saveLeadSchema = z.object({
  conversationId: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "El nombre es obligatorio."),
  rut: z.string().trim().min(1, "El RUT es obligatorio."),
  type: leadTypeSchema,
  notes: z.string().trim().max(500, "Máximo 500 caracteres.").optional().default(""),
  lines: z.array(leadLineSchema).optional().default([]),
});

export type SaveLeadValues = z.infer<typeof saveLeadSchema>;
