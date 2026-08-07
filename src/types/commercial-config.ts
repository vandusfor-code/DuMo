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

/** Cupón de descuento en equipos y accesorios. */
export type PlanHandsetCoupon = {
  enabled: boolean;
  percent: number;
  limitAmount: number;
  periodMonths: number;
};

/** Cuotas gratis al financiar equipo. */
export type PlanFreeDeviceInstallments = {
  enabled: boolean;
  installmentNumbers: number[];
};

/** PedidosYa Plus — solo Plan M. */
export type PlanPedidosYaPlus = {
  enabled: boolean;
  conditions: string;
};

/** Boletas promocionales ($0). */
export type PlanFreeBills = {
  billNumbers: number[];
  /** Línea principal en Portabilidad. */
  appliesToMainLine: boolean;
  /** Líneas adicionales en Portabilidad y Línea Nueva. */
  appliesToAdditionalLines: boolean;
};

/**
 * Oferta comercial estructurada — única fuente de verdad para el teleprompter.
 * El motor construye el discurso desde estos atributos; nunca desde párrafos fijos.
 */
export type PlanOffer = {
  dataAllowance: string;
  unlimitedMinutes: boolean;
  unlimitedSms: boolean;
  freeApps: boolean;
  /** Apps incluidas cuando freeApps es true (Bloque 4 Con Equipo). */
  freeAppNames: string[];
  roamingWhatsapp: boolean;
  roamingGb: number | null;
  additionalLinePrice: number | null;
  maxAdditionalLines: number;
  clubWom: boolean;
  clubBenefits: string[];
  /** Si true, el Bloque 4 Con Equipo enumera clubBenefits en el discurso. */
  clubWomListPartners: boolean;
  handsetCoupon: PlanHandsetCoupon | null;
  freeDeviceInstallments: PlanFreeDeviceInstallments | null;
  pedidosYaPlus: PlanPedidosYaPlus | null;
  /** Texto corto PedidosYa en Bloque 4 Con Equipo (sin condiciones). */
  pedidosYaTeleprompterLabel: string;
  freeBills: PlanFreeBills;
  /** Encabezado oficial Bloque 4 Con Equipo (ej. PLAN SIMPLE W 150 GB). */
  teleprompterHeading: string;
  /** Frase de datos en Bloque 4 Con Equipo (ej. 150 Gigas, Gigas Libres). */
  dataAllowanceSpeechLabel: string;
};

export interface CommercialPlan {
  id: string;
  name: string;
  operator: string;
  saleType: CommercialSaleType;
  /** Precio mensual al cliente (WOM) — cargo fijo real para cálculos. */
  womValue: number;
  /** Precio promocional — solo informativo; nunca usar en el motor comercial. */
  promotionalPrice?: number | null;
  /** Orden comercial para presentación (menor = primero). */
  commercialOrder?: number | null;
  /** Valor mensual por línea adicional — derivado de offer.additionalLinePrice. */
  additionalLineValue: number;
  /** Cantidad máxima de líneas (principal + adicionales). */
  maxLines: number;
  dumoValue: number;
  advisorCommission: number;
  /** Oferta estructurada — fuente de verdad para teleprompter. */
  offer: PlanOffer;
  specialConditions: string;
  status: CommercialPlanStatus;
}

export interface CommercialGlobalSettings {
  monthlyGoal: number;
  economicGoal: number;
  baseCommission: number;
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
  promotionalPrice?: number | null;
  commercialOrder?: number | null;
  additionalLineValue: number;
  maxLines: number;
  dumoValue: number;
  advisorCommission: number;
  offer: PlanOffer;
  specialConditions: string;
  status: CommercialPlanStatus;
}

export type UpdateCommercialSettingsInput = CommercialGlobalSettings;
