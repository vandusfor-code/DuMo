import "server-only";
import type {
  AccountingChartPoint,
  AccountingFilters,
  AccountingResult,
  CreateExpenseInput,
  Expense,
} from "@/types/accounting";
import { ACCOUNTING_MONTHLY_BUDGET } from "@/data/mock/accounting.mock";
import { getCommercialConfigurationRepository } from "@/repositories/commercial-configuration.repository";
import { getPostgresSalesStore } from "@/repositories/postgres-sales.repository";
import { getConfig, setConfig } from "@/server/db/app-config";
import { ensureSchema, getSql, hasDatabase } from "@/server/db/client";

export interface AccountingRepository {
  getOverview(filters: AccountingFilters): Promise<AccountingResult>;
  createExpense(input: CreateExpenseInput): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

const BUDGET_KEY = "accounting_monthly_budget";

function monthKey(filters: AccountingFilters): string {
  return `${filters.year}-${filters.month.padStart(2, "0")}`;
}

function filterExpenses(filters: AccountingFilters, expenses: Expense[]): Expense[] {
  const key = monthKey(filters);
  return expenses.filter((e) => e.date.startsWith(key));
}

function buildChart(expenses: Expense[]): AccountingChartPoint[] {
  const now = new Date();
  const points: AccountingChartPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthExpenses = expenses
      .filter((e) => e.date.startsWith(key))
      .reduce((s, e) => s + e.amount, 0);
    points.push({
      label: d.toLocaleDateString("es-CL", { month: "short" }),
      income: 0,
      expenses: monthExpenses,
      profit: -monthExpenses,
    });
  }

  return points;
}

interface MonthCommercialStats {
  salesCount: number;
  dumoIncome: number;
}

async function buildSummary(
  expenses: Expense[],
  monthlyBudget: number,
  stats: MonthCommercialStats = { salesCount: 0, dumoIncome: 0 },
) {
  let monthlyGoal = 0;
  let economicGoal = 0;
  try {
    const config = await getCommercialConfigurationRepository().getSnapshot();
    monthlyGoal = config.settings.monthlyGoal;
    economicGoal = config.settings.economicGoal;
    const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const available = monthlyBudget - monthlyExpenses;
    const estimatedProfit = stats.dumoIncome - monthlyExpenses;
    const salesNeededForGoal = Math.max(0, monthlyGoal - stats.salesCount);

    return {
      monthlyBudget,
      monthlyExpenses,
      available,
      estimatedProfit,
      monthlyGoal,
      currentSales: stats.salesCount,
      salesNeededForGoal,
      economicGoal,
      currentIncome: stats.dumoIncome,
    };
  } catch (err) {
    console.error("[accounting] buildSummary", err);
    const monthlyExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    return {
      monthlyBudget,
      monthlyExpenses,
      available: monthlyBudget - monthlyExpenses,
      estimatedProfit: stats.dumoIncome - monthlyExpenses,
      monthlyGoal,
      currentSales: stats.salesCount,
      salesNeededForGoal: Math.max(0, monthlyGoal - stats.salesCount),
      economicGoal,
      currentIncome: stats.dumoIncome,
    };
  }
}

function requireSql() {
  const sql = getSql();
  if (!sql) {
    throw new Error("DATABASE_URL no configurada. Contabilidad requiere Postgres.");
  }
  return sql;
}

function mapExpenseRow(r: {
  id: string;
  date: string | Date;
  category: string;
  description: string;
  amount: string | number;
  user_name: string;
}): Expense {
  const date =
    r.date instanceof Date
      ? r.date.toISOString().slice(0, 10)
      : String(r.date).slice(0, 10);
  return {
    id: r.id,
    date,
    category: r.category as Expense["category"],
    description: r.description,
    amount: Number(r.amount),
    user: r.user_name,
  };
}

class PostgresAccountingRepository implements AccountingRepository {
  private async listAllExpenses(): Promise<Expense[]> {
    await ensureSchema();
    const sql = requireSql();
    const rows = await sql`
      SELECT id, date, category, description, amount, user_name
      FROM accounting_expenses
      ORDER BY date DESC, created_at DESC
    `;
    return rows.map((r) => mapExpenseRow(r as Parameters<typeof mapExpenseRow>[0]));
  }

  async getOverview(filters: AccountingFilters) {
    const expenses = await this.listAllExpenses();
    const filtered = filterExpenses(filters, expenses);
    let monthlyBudget = 0;
    try {
      const config = await getCommercialConfigurationRepository().getSnapshot();
      monthlyBudget = config.settings.monthlyBudget;
    } catch (err) {
      console.error("[accounting] load budget", err);
      monthlyBudget = await getConfig(BUDGET_KEY, ACCOUNTING_MONTHLY_BUDGET);
    }
    const key = monthKey(filters);
    let stats: MonthCommercialStats = { salesCount: 0, dumoIncome: 0 };
    try {
      stats = await getPostgresSalesStore().getMonthCommercialStats(key);
    } catch (err) {
      console.error("[accounting] month stats", err);
    }
    const summary = await buildSummary(filtered, monthlyBudget, stats);
    const chart = buildChart(expenses);

    return {
      summary,
      chart,
      expenses: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  async createExpense(input: CreateExpenseInput) {
    await ensureSchema();
    const sql = requireSql();
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await sql`
      INSERT INTO accounting_expenses (id, date, category, description, amount, user_name)
      VALUES (
        ${id},
        ${input.date},
        ${input.category},
        ${input.description},
        ${input.amount},
        ${input.user}
      )
    `;
    return {
      id,
      date: input.date,
      category: input.category,
      description: input.description,
      amount: input.amount,
      user: input.user,
    };
  }

  async deleteExpense(id: string) {
    await ensureSchema();
    const sql = requireSql();
    await sql`DELETE FROM accounting_expenses WHERE id = ${id}`;
  }
}

/** Fallback en memoria solo cuando no hay DATABASE_URL (desarrollo local). */
class MockAccountingRepository implements AccountingRepository {
  private expenses: Expense[] = [];

  async getOverview(filters: AccountingFilters) {
    const filtered = filterExpenses(filters, this.expenses);
    let monthlyBudget = ACCOUNTING_MONTHLY_BUDGET;
    try {
      const config = await getCommercialConfigurationRepository().getSnapshot();
      monthlyBudget = config.settings.monthlyBudget;
    } catch {
      /* mock fallback */
    }
    const summary = await buildSummary(filtered, monthlyBudget);
    return {
      summary,
      chart: buildChart(this.expenses),
      expenses: filtered.sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  async createExpense(input: CreateExpenseInput) {
    const expense: Expense = { id: `exp-${Date.now()}`, ...input };
    this.expenses.unshift(expense);
    return expense;
  }

  async deleteExpense(id: string) {
    this.expenses = this.expenses.filter((e) => e.id !== id);
  }
}

export function getAccountingRepository(): AccountingRepository {
  if (hasDatabase()) return new PostgresAccountingRepository();
  return new MockAccountingRepository();
}

export async function setAccountingMonthlyBudget(amount: number): Promise<void> {
  const normalized = Number(amount) || 0;
  await setConfig(BUDGET_KEY, normalized);
  try {
    const repo = getCommercialConfigurationRepository();
    const { settings } = await repo.getSnapshot();
    await repo.updateSettings({ ...settings, monthlyBudget: normalized });
  } catch (err) {
    console.error("[accounting] sync commercial budget", err);
  }
}
