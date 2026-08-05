export type CommercialPlanStatus = "active" | "inactive";

export type CommercialSaleType =
  | "portabilidad"
  | "migracion"
  | "renovacion"
  | "linea_nueva"
  | "fibra"
  | "prepago"
  | "postpago";

export const COMMERCIAL_SALE_TYPE_LABELS: Record<CommercialSaleType, string> = {
  portabilidad: "Portabilidad",
  migracion: "Migración",
  renovacion: "Renovación",
  linea_nueva: "Línea nueva",
  fibra: "Fibra",
  prepago: "Prepago",
  postpago: "Postpago",
};

export interface CommercialPlan {
  id: string;
  name: string;
  operator: string;
  saleType: CommercialSaleType;
  /** Precio al cliente final (WOM) — visible para asesoras. */
  womValue: number;
  /** Lo que WOM paga a DuMo — base de contabilidad admin. */
  dumoValue: number;
  advisorCommission: number;
  status: CommercialPlanStatus;
}

export interface CommercialGlobalSettings {
  /** Ventas totales del equipo al mes (ej. 120). */
  monthlyGoal: number;
  /** Ingreso DuMo total objetivo del mes en pesos. Se reparte entre asesoras. */
  economicGoal: number;
  /** Comisión por línea si el plan vendido no coincide con la tabla. */
  baseCommission: number;
  /** Presupuesto mensual de gastos — base para disponible y presupuesto restante. */
  monthlyBudget: number;
}

export interface CommercialConfigSnapshot {
  plans: CommercialPlan[];
  settings: CommercialGlobalSettings;
}

export interface UpsertCommercialPlanInput {
  name: string;
  operator: string;
  saleType: CommercialSaleType;
  womValue: number;
  dumoValue: number;
  advisorCommission: number;
  status: CommercialPlanStatus;
}

export type UpdateCommercialSettingsInput = CommercialGlobalSettings;
