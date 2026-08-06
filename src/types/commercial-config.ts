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
  /** Valor mensual por línea adicional. */
  additionalLineValue: number;
  /** Cantidad máxima de líneas permitidas. */
  maxLines: number;
  /** Lo que WOM paga a DuMo — base de contabilidad admin. */
  dumoValue: number;
  advisorCommission: number;
  /** Beneficios incluidos (etiquetas cortas para admin). */
  benefits: string[];
  /** Promociones activas (ej. 3° boleta $0). */
  promotions: string[];
  /** Texto comercial oficial que lee la asesora en el script. */
  commercialText: string;
  /** Condiciones especiales del plan. */
  specialConditions: string;
  /** Especificaciones técnicas para variables del motor de scripts. */
  specs?: CommercialPlanSpecs;
  status: CommercialPlanStatus;
}

export interface CommercialPlanSpecs {
  gb: string;
  sms: string;
  minutes: string;
  appsLibres: string;
  roaming: string;
  clubWom: string;
  pedidosYa: string;
  cuponEquipos: string;
  cuotasGratis: string;
  maxAdditionalLines: number;
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
  additionalLineValue: number;
  maxLines: number;
  dumoValue: number;
  advisorCommission: number;
  benefits: string[];
  promotions: string[];
  commercialText: string;
  specialConditions: string;
  specs?: CommercialPlanSpecs;
  status: CommercialPlanStatus;
}

export type UpdateCommercialSettingsInput = CommercialGlobalSettings;
