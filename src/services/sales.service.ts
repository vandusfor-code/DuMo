import "server-only";
import { getSalesRepository } from "@/repositories/sales.repository";
import type { NewSaleInput, SaleDetail, SaleSummary } from "@/types/sale";

export const salesService = {
  list(): Promise<SaleSummary[]> {
    return getSalesRepository().list();
  },
  getById(id: string): Promise<SaleDetail | null> {
    return getSalesRepository().getById(id);
  },
  create(input: NewSaleInput): Promise<SaleDetail> {
    return getSalesRepository().create(input);
  },
};
