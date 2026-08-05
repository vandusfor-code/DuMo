export type ExpenseCategory =
  | "publicidad_meta"
  | "publicidad_google"
  | "whatsapp_api"
  | "claude"
  | "openai"
  | "hosting"
  | "dominio"
  | "nomina"
  | "servicios"
  | "otros";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  publicidad_meta: "Publicidad Meta",
  publicidad_google: "Publicidad Google",
  whatsapp_api: "WhatsApp API",
  claude: "Claude",
  openai: "OpenAI",
  hosting: "Hosting",
  dominio: "Dominio",
  nomina: "Nómina",
  servicios: "Servicios",
  otros: "Otros",
};

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  user: string;
}

export interface AccountingSummary {
  monthlyBudget: number;
  monthlyExpenses: number;
  available: number;
  estimatedProfit: number;
  monthlyGoal: number;
  salesNeededForGoal: number;
}

export interface AccountingChartPoint {
  label: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface AccountingResult {
  summary: AccountingSummary;
  chart: AccountingChartPoint[];
  expenses: Expense[];
}

export interface CreateExpenseInput {
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  user: string;
}

export interface AccountingFilters {
  month: string;
  year: string;
}
