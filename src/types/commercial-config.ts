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
  operatorPayment: number;
  advisorCommission: number;
  status: CommercialPlanStatus;
}

export interface CommercialGlobalSettings {
  monthlyGoal: number;
  profitGoal: number;
  baseCommission: number;
  specialBonus: number;
  campaignCommission: number;
}

export interface CommercialConfigSnapshot {
  plans: CommercialPlan[];
  settings: CommercialGlobalSettings;
}

export interface UpsertCommercialPlanInput {
  name: string;
  operator: string;
  saleType: CommercialSaleType;
  operatorPayment: number;
  advisorCommission: number;
  status: CommercialPlanStatus;
}

export interface UpdateCommercialSettingsInput {
  monthlyGoal: number;
  profitGoal: number;
  baseCommission: number;
  specialBonus: number;
  campaignCommission: number;
}
