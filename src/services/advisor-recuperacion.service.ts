import "server-only";
import { listAdvisorRecuperacion } from "@/repositories/advisor-recuperacion.repository";
import type { AdvisorRecuperacionFilters } from "@/types/advisor-recuperacion";

export const advisorRecuperacionService = {
  list(advisorId: string, filters: AdvisorRecuperacionFilters) {
    return listAdvisorRecuperacion(advisorId, filters);
  },
};
