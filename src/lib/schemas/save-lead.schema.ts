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

/**
 * DUO-1 — campos del formulario de Operación Duo. Sin esto en el schema,
 * Zod descarta `duoSale` en silencio (los objetos de Zod ignoran claves no
 * declaradas por defecto) y la gestión se guarda normal sin crear nunca el
 * caso en duo_sales — exactamente el bug reportado: "no me registra nada".
 */
export const duoSaleFormSchema = z.object({
  currentCompany: z.string().trim().optional().default(""),
  email: z.string().trim().optional().default(""),
  region: z.string().trim().optional().default(""),
  comuna: z.string().trim().optional().default(""),
  street: z.string().trim().optional().default(""),
  houseNumber: z.string().trim().optional().default(""),
  plan: z.string().trim().optional().default(""),
  equipment: z.string().trim().optional().default(""),
  saleType: z.string().trim().optional().default(""),
  dispatch: z.string().trim().optional().default(""),
  dumoRegisteredName: z.string().trim().optional().default(""),
  callTime: z.string().trim().optional().default(""),
  comments: z.string().trim().optional().default(""),
});

export const saveLeadSchema = z.object({
  conversationId: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  customerName: z.string().trim().min(1, "El nombre es obligatorio."),
  rut: z.string().trim().min(1, "El RUT es obligatorio."),
  carrier: z.enum(["wom", "claro"]).optional().default("wom"),
  type: z.string().trim().min(1, "Selecciona una tipificación."),
  notes: z.string().trim().max(4000, "Máximo 4000 caracteres.").optional().default(""),
  lines: z.array(leadLineSchema).optional().default([]),
  /** Si es true, también registra la venta en Mis Ventas. */
  registerSale: z.boolean().optional().default(false),
  saveAction: z.enum(["tipify", "script", "sale", "close"]).optional().default("script"),
  followUpDate: z.string().trim().optional().nullable(),
  duoSale: duoSaleFormSchema.optional(),
  /** Radicado escrito por la asesora. Opcional aquí — se exige y valida
   * (formato + unicidad) en la ruta, solo para venta/Operación Duo, porque
   * eso depende del catálogo dinámico de tipificaciones (no algo que Zod
   * pueda resolver de forma síncrona). */
  folioNumber: z.string().trim().optional().default(""),
});

export type SaveLeadValues = z.infer<typeof saveLeadSchema>;
