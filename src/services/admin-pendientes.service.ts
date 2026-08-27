import "server-only";
import {
  listAdminPendientes,
  transferPendienteToAdvisor,
} from "@/repositories/admin-pendientes.repository";
import type { AdminPendientesFilters } from "@/types/admin-pendientes";

export const adminPendientesService = {
  list(filters: AdminPendientesFilters) {
    return listAdminPendientes(filters);
  },

  transfer(input: { pendienteId: string; advisorId: string }) {
    return transferPendienteToAdvisor(input);
  },
};
