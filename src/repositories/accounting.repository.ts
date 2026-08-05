import "server-only";
import type {
  AccountingFilters,
  AccountingResult,
  CreateExpenseInput,
  Expense,
} from "@/types/accounting";
import {
  ACCOUNTING_CHART_MOCK,
  ACCOUNTING_MONTHLY_BUDGET,
  EXPENSES_MOCK,
} from "@/data/mock/accounting.mock";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { withLatency } from "@/lib/mock";

export interface AccountingRepository {
  getOverview(filters: AccountingFilters): Promise<AccountingResult>;
  createExpense(input: CreateExpenseInput): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

function monthKey(filters: AccountingFilters): string {
  return `${filters.year}-${filters.month.padStart(2, "0")}`;
}

function filterExpenses(filters: AccountingFilters, expenses: Expense[]): Expense[] {
  const key = monthKey(filters);
  return expenses.filter((e) => e.date.startsWith(key));
}

async function buildSummary(expenses: Expense[]) {
  const config = await getCommercialConfigurationRepository().getSnapshot();
  const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const monthlyBudget = ACCOUNTING_MONTHLY_BUDGET;
  const available = monthlyBudget - monthlyExpenses;
  const chartPoint = ACCOUNTING_CHART_MOCK[ACCOUNTING_CHART_MOCK.length - 1];
  const estimatedProfit = chartPoint.income - monthlyExpenses;
  const monthlyGoal = config.settings.monthlyGoal;
  const avgSaleValue = config.plans
    .filter((p) => p.status === "active")
    .reduce((s, p) => s + p.operatorPayment, 0) / Math.max(1, config.plans.filter((p) => p.status === "active").length);
  const salesNeededForGoal = Math.ceil(Math.max(0, monthlyGoal - chartPoint.income) / avgSaleValue);

  return {
    monthlyBudget,
    monthlyExpenses,
    available,
    estimatedProfit,
    monthlyGoal,
    salesNeededForGoal,
  };
}

class MockAccountingRepository implements AccountingRepository {
  private expenses = [...EXPENSES_MOCK];

  async getOverview(filters: AccountingFilters) {
    const filtered = filterExpenses(filters, this.expenses);
    const summary = await buildSummary(filtered);
    return withLatency({
      summary,
      chart: ACCOUNTING_CHART_MOCK,
      expenses: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    });
  }

  async createExpense(input: CreateExpenseInput) {
    const expense: Expense = { id: `exp-${Date.now()}`, ...input };
    this.expenses.unshift(expense);
    return withLatency(expense);
  }

  deleteExpense(id: string) {
    this.expenses = this.expenses.filter((e) => e.id !== id);
    return withLatency(undefined);
  }
}

export function getAccountingRepository(): AccountingRepository {
  return new MockAccountingRepository();
}
