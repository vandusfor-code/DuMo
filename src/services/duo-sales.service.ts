import "server-only";
import { getDuoSalesRepository } from "@/repositories/duo-sales.repository";
import type { CloseDuoSaleResult, CreateDuoSaleInput, DuoSale } from "@/types/duo-sale";

export const duoSalesService = {
  create(input: CreateDuoSaleInput): Promise<DuoSale> {
    return getDuoSalesRepository().create(input);
  },
  listAll(): Promise<DuoSale[]> {
    return getDuoSalesRepository().listAll();
  },
  listForClosingAdvisor(advisorId: string): Promise<DuoSale[]> {
    return getDuoSalesRepository().listForClosingAdvisor(advisorId);
  },
  getById(id: string): Promise<DuoSale | null> {
    return getDuoSalesRepository().getById(id);
  },
  assign(id: string, advisor: { id: string; name: string }): Promise<DuoSale> {
    return getDuoSalesRepository().assign(id, advisor);
  },
  addClosingNote(id: string, note: { text: string; author: string }): Promise<DuoSale> {
    return getDuoSalesRepository().addClosingNote(id, note);
  },
  isActiveClosingAdvisor(conversationId: string, advisorId: string): Promise<boolean> {
    return getDuoSalesRepository().isActiveClosingAdvisor(conversationId, advisorId);
  },
  close(id: string, closingAdvisorId: string): Promise<CloseDuoSaleResult> {
    return getDuoSalesRepository().close(id, closingAdvisorId);
  },
};
