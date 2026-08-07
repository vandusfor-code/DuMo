import "server-only";
import { getAdminSalesRepository } from "@/repositories/admin-sales.repository";
import type { AdminSaleStatus, AdminSalesFilters, AdminSalesResult } from "@/types/admin-sale";
import type { SaleDetail } from "@/types/sale";

export const adminSalesService = {
  list(filters: AdminSalesFilters): Promise<AdminSalesResult> {
    return getAdminSalesRepository().list(filters);
  },

  getById(id: string): Promise<SaleDetail | null> {
    return getAdminSalesRepository().getById(id);
  },

  updateStatuses(ids: string[], status: AdminSaleStatus): Promise<void> {
    return getAdminSalesRepository().updateStatuses(ids, status);
  },

  deleteSales(ids: string[]): Promise<void> {
    return getAdminSalesRepository().deleteSales(ids);
  },
};
