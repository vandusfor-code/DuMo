import "server-only";
import { ADMIN_DASHBOARD_MOCK } from "@/data/mock/admin-dashboard.mock";
import { COMMERCIAL_PLANS_MOCK, COMMERCIAL_SETTINGS_MOCK } from "@/data/mock/commercial-config.mock";
import type { AdminCommissionResult } from "@/types/admin-commission";
import type { AdminSalesResult } from "@/types/admin-sale";
import type { AccountingResult } from "@/types/accounting";
import type { AdvisorsResult } from "@/types/admin-advisor";

const EMPTY_SALES_SUMMARY = {
  total: 0,
  registrada: 0,
  en_reparto: 0,
  finalizada: 0,
  rechazada: 0,
  cancelada: 0,
};

export function emptyAdminSalesResult(): AdminSalesResult {
  return { rows: [], total: 0, summary: { ...EMPTY_SALES_SUMMARY } };
}

export function emptyAdminCommissionsResult(): AdminCommissionResult {
  return {
    summary: { pendingTotal: 0, paidTotal: 0, finalizedSales: 0, totalToPay: 0 },
    rows: [],
  };
}

export function emptyAccountingResult(): AccountingResult {
  return {
    summary: {
      monthlyBudget: 0,
      monthlyExpenses: 0,
      available: 0,
      estimatedProfit: 0,
      monthlyGoal: 0,
      currentSales: 0,
      salesNeededForGoal: 0,
      economicGoal: 0,
      currentIncome: 0,
    },
    chart: [],
    expenses: [],
  };
}

export function emptyAdvisorsResult(): AdvisorsResult {
  return {
    rows: [],
    summary: { total: 0, active: 0, totalSalesMonth: 0, avgConversion: 0, teamMonthlyGoal: 0, assignedGoalsTotal: 0 },
  };
}

export function adminDashboardFallback() {
  return { ...ADMIN_DASHBOARD_MOCK };
}

export function commercialConfigFallback() {
  return {
    plans: [...COMMERCIAL_PLANS_MOCK],
    settings: { ...COMMERCIAL_SETTINGS_MOCK },
  };
}

/** Ejecuta un handler con timeout; en error devuelve el fallback (siempre HTTP 200 en GET). */
export async function withAdminFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
  timeoutMs = 12_000,
): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs),
      ),
    ]);
  } catch (error) {
    console.error(`[admin-api] ${label}`, error);
    return fallback;
  }
}
