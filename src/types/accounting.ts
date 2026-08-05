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
  /** Meta de ventas del equipo (cantidad). */
  monthlyGoal: number;
  /** Ventas registradas en el mes. */
  currentSales: number;
  /** Ventas que faltan para la meta. */
  salesNeededForGoal: number;
  /** Meta económica del mes (ingreso DuMo objetivo). */
  economicGoal: number;
  /** Ingreso DuMo de ventas finalizadas en el mes. */
  currentIncome: number;
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
