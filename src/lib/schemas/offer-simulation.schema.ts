import { z } from "zod";

export const offerSimulationRequestSchema = z.object({
  leadId: z.string().min(1, "Lead requerido."),
  saleType: z.enum(["portability", "new_line"]),
  requestedLines: z.number().int().min(1).max(5),
  lineCredit: z.number().min(0, "Cupo línea no puede ser negativo."),
  equipmentCredit: z.number().min(0, "Cupo equipo no puede ser negativo."),
  wantsEquipment: z.boolean(),
});
