import "server-only";
import { getAdminSalesRepository } from "@/repositories/admin-sales.repository";
import type { AdminSalesFilters, AdminSalesResult } from "@/types/admin-sale";

export const adminSalesService = {
  list(filters: AdminSalesFilters): Promise<AdminSalesResult> {
    return getAdminSalesRepository().list(filters);
  },
};
