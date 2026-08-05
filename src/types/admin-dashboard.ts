import type { ChartPoint } from "./common";

/** Un KPI con su variación respecto al periodo anterior. */
export interface AdminKpi {
  /** Valor ya formateado para mostrar (ej. "48", "34.2%", "$12.850.000"). */
  value: string;
  /** Variación porcentual (positiva/negativa). */
  delta: number;
  /** Texto de referencia del delta, ej. "vs ayer" / "vs mes anterior". */
  deltaLabel: string;
}

/** Una barra con etiqueta y valor (asesora / tipo / estado). */
export interface NamedValue {
  label: string;
  value: number;
}

export interface AdminAlert {
  kind: "goal" | "budget" | "delivery";
  message: string;
  /** Progreso 0–100 (solo para el tipo "goal"). */
  progress?: number;
}

export interface AdminActivity {
  time: string; // "10:24"
  person: string;
  action: string; // "registró una venta"
}

export interface MonthlyGoal {
  goal: number;
  current: number;
  /** Avance 0–100. */
  progress: number;
  remaining: number;
  salesNeeded: number;
}

export interface AdminDashboardData {
  kpis: {
    salesToday: AdminKpi;
    finishedToday: AdminKpi;
    inDelivery: AdminKpi;
    salesMonth: AdminKpi;
    conversion: AdminKpi;
    profit: AdminKpi;
    expenses: AdminKpi;
    budgetLeft: AdminKpi;
  };
  salesByAdvisor: NamedValue[];
  salesByDay: ChartPoint[];
  salesByType: NamedValue[];
  salesByStatus: NamedValue[];
  alerts: AdminAlert[];
  activity: AdminActivity[];
  monthlyGoal: MonthlyGoal;
}
