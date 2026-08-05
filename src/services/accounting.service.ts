import "server-only";
import { getAccountingRepository } from "@/repositories/accounting.repository";
import type { AccountingFilters, AccountingResult, CreateExpenseInput, Expense } from "@/types/accounting";

export const accountingService = {
  getOverview(filters: AccountingFilters): Promise<AccountingResult> {
    return getAccountingRepository().getOverview(filters);
  },
  createExpense(input: CreateExpenseInput): Promise<Expense> {
    return getAccountingRepository().createExpense(input);
  },
  deleteExpense(id: string): Promise<void> {
    return getAccountingRepository().deleteExpense(id);
  },
};
