import { z } from "zod";

const saleTypeSchema = z.enum([
  "portability_postpaid",
  "portability_prepaid",
  "new_line",
]);

export const offerSimulationRequestSchema = z
  .object({
    leadId: z.string().min(1, "Lead requerido."),
    saleType: saleTypeSchema,
    requestedLines: z.number().int().min(1).max(5),
    lineCredit: z.number().min(0, "Cupo línea no puede ser negativo."),
    equipmentCredit: z.number().min(0, "Cupo equipo no puede ser negativo.").optional(),
    wantsEquipment: z.boolean().optional(),
  })
  .transform((data) => {
    if (data.saleType === "portability_prepaid") {
      return {
        ...data,
        equipmentCredit: 0,
        wantsEquipment: false,
      };
    }
    return {
      ...data,
      equipmentCredit: data.equipmentCredit ?? 0,
      wantsEquipment: data.wantsEquipment ?? false,
    };
  });
