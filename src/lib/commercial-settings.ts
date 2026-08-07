import type { CommercialGlobalSettings } from "@/types/commercial-config";

type StoredSettings = Partial<
  CommercialGlobalSettings & {
    profitGoal?: number;
    specialBonus?: number;
    campaignCommission?: number;
  }
>;

/** Normaliza configuración guardada (campos legacy). */
export function normalizeCommercialSettings(raw: StoredSettings): CommercialGlobalSettings {
  return {
    monthlyGoal: Number(raw.monthlyGoal ?? 0) || 0,
    economicGoal: Number(raw.economicGoal ?? raw.profitGoal ?? 0) || 0,
    baseCommission: Number(raw.baseCommission ?? 0) || 0,
    monthlyBudget: Number(raw.monthlyBudget ?? 0) || 0,
  };
}

/** Meta individual por asesora (ej. 120 ventas ÷ 2 asesoras = 60). */
export function perAdvisorSalesGoal(totalSales: number, activeAdvisorCount: number): number {
  const n = Math.max(1, activeAdvisorCount);
  if (totalSales <= 0) return 0;
  return Math.max(1, Math.round(totalSales / n));
}

/** Meta del mes para una asesora: la asignada por admin o reparto equitativo del equipo. */
export function resolveAdvisorSalesGoal(
  advisor: { monthlySalesGoal?: number | null } | null | undefined,
  teamMonthlyGoal: number,
  activeAdvisorCount: number,
): number {
  const assigned = advisor?.monthlySalesGoal;
  if (assigned != null && assigned > 0) return assigned;
  return perAdvisorSalesGoal(teamMonthlyGoal, activeAdvisorCount);
}

/** Meta económica individual por asesora (ingreso DuMo objetivo). */
export function perAdvisorEconomicGoal(totalEconomic: number, activeAdvisorCount: number): number {
  const n = Math.max(1, activeAdvisorCount);
  if (totalEconomic <= 0) return 0;
  return Math.round(totalEconomic / n);
}

export function salesProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}

export function economicProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}
