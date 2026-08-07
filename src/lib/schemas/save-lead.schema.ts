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

export const equipmentModeSchema = z.enum(["none", "with"]);

export const currentOperatorSchema = z.enum([
  "claro",
  "movistar",
  "entel",
  "wom",
  "virgin",
  "vtr",
  "gtd",
  "other",
]);

export const deliveryTypeSchema = z.enum(["home", "store"]);

export const lineAccountTypeSchema = z.enum(["prepaid", "postpaid"]);

export const leadLineSchema = z.object({
  phone: z.string().trim().min(1, "El número de línea es obligatorio."),
  saleType: leadSaleTypeSchema,
  planId: z.string().trim().min(1, "Selecciona un plan."),
  equipment: z.string().trim().optional().default(""),
  equipmentMode: z.union([equipmentModeSchema, z.literal("")]).optional().default(""),
  currentOperator: z.union([currentOperatorSchema, z.literal("")]).optional().default(""),
  deliveryType: z.union([deliveryTypeSchema, z.literal("")]).optional().default(""),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Correo electrónico inválido.",
    }),
  deliveryAddress: z.string().trim().optional().default(""),
  region: z.string().trim().min(1, "Selecciona una región."),
  comuna: z.string().trim().min(1, "Selecciona una comuna."),
  equipmentCatalogId: z.string().trim().optional().default(""),
  equipmentModel: z.string().trim().optional().default(""),
  equipmentValue: z.string().trim().optional().default(""),
  equipmentDownPayment: z.string().trim().optional().default(""),
  equipmentInstallments: z.string().trim().optional().default(""),
  equipmentInstallmentValue: z.string().trim().optional().default(""),
  equipmentCommercialText: z.string().trim().optional().default(""),
  accountType: lineAccountTypeSchema.optional().default("postpaid"),
  isUpselling: z.boolean().optional().default(false),
});

export const saveLeadSchema = z.object({
  conversationId: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "El nombre es obligatorio."),
  rut: z.string().trim().min(1, "El RUT es obligatorio."),
  type: leadTypeSchema,
  notes: z.string().trim().max(4000, "Máximo 4000 caracteres.").optional().default(""),
  lines: z.array(leadLineSchema).optional().default([]),
  /** Si es true, también registra la venta en Mis Ventas. */
  registerSale: z.boolean().optional().default(false),
});

export type SaveLeadValues = z.infer<typeof saveLeadSchema>;
