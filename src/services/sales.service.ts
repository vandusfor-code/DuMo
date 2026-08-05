import "server-only";
import type { AdvisorScope } from "@/lib/advisor-scope";
import { getSalesRepository } from "@/repositories/sales.repository";
import type { NewSaleInput, SaleDetail, SaleSummary } from "@/types/sale";

export const salesService = {
  list(scope?: AdvisorScope | null): Promise<SaleSummary[]> {
    return getSalesRepository().list(scope ?? null);
  },
  getById(id: string): Promise<SaleDetail | null> {
    return getSalesRepository().getById(id);
  },
  create(input: NewSaleInput, scope?: AdvisorScope | null): Promise<SaleDetail> {
    return getSalesRepository().create(input, scope ?? null);
  },
};
