import type { Expense } from "@/types/accounting";

export const EXPENSES_MOCK: Expense[] = [
  { id: "exp-001", date: "2025-08-01", category: "publicidad_meta", description: "Campaña agosto — retargeting", amount: 850000, user: "Admin" },
  { id: "exp-002", date: "2025-08-02", category: "whatsapp_api", description: "Conversaciones Cloud API", amount: 320000, user: "Sistema" },
  { id: "exp-003", date: "2025-08-03", category: "claude", description: "Suscripción API Claude", amount: 180000, user: "Admin" },
  { id: "exp-004", date: "2025-08-03", category: "nomina", description: "Nómina asesoras — quincena 1", amount: 4200000, user: "Admin" },
  { id: "exp-005", date: "2025-08-04", category: "hosting", description: "Vercel + Neon Postgres", amount: 95000, user: "Sistema" },
  { id: "exp-006", date: "2025-08-04", category: "publicidad_google", description: "Google Ads — keywords portabilidad", amount: 620000, user: "Admin" },
  { id: "exp-007", date: "2025-07-28", category: "openai", description: "OpenAI API usage", amount: 75000, user: "Sistema" },
  { id: "exp-008", date: "2025-07-25", category: "servicios", description: "Herramientas CRM", amount: 120000, user: "Admin" },
];

export const ACCOUNTING_MONTHLY_BUDGET = 12000000;

export const ACCOUNTING_CHART_MOCK = [
  { label: "Mar", income: 8200000, expenses: 6100000, profit: 2100000 },
  { label: "Abr", income: 9100000, expenses: 6800000, profit: 2300000 },
  { label: "May", income: 9800000, expenses: 7200000, profit: 2600000 },
  { label: "Jun", income: 10200000, expenses: 7400000, profit: 2800000 },
  { label: "Jul", income: 10800000, expenses: 7800000, profit: 3000000 },
  { label: "Ago", income: 9500000, expenses: 6560000, profit: 2940000 },
];
