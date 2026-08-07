/** Tipo de venta del motor de oferta (subset comercial). */
export type OfferSaleType = "portability" | "new_line";

export const OFFER_SALE_TYPE_LABELS: Record<OfferSaleType, string> = {
  portability: "Portabilidad",
  new_line: "Línea Nueva",
};

/** Resumen de estado por tarjeta de plan. */
export type OfferPlanCardStatus = "Aprobada" | "No viable";

export type OfferEligibleEquipment = {
  id: string;
  commercialName: string;
  brand: string;
  model: string;
  installmentValue: number;
};

/** Una alternativa comercial evaluada automáticamente por plan. */
export type OfferPlanAlternative = {
  planId: string;
  planName: string;
  mainLineFixedCharge: number;
  additionalLinesCount: number;
  additionalLineUnitPrice: number;
  additionalLinesTotal: number;
  totalMonthlyFixed: number;
  lineCredit: number;
  consumedCredit: number;
  remainingCredit: number;
  viable: boolean;
  statusLabel: OfferPlanCardStatus;
  notViableReason?: string;
  wantsEquipment: boolean;
  maxEquipmentInstallment: number;
  equipmentViable: boolean;
  equipmentOnlyWithoutDevice: boolean;
  eligibleEquipment: OfferEligibleEquipment[];
};

export type OfferSimulationRequest = {
  leadId: string;
  saleType: OfferSaleType;
  requestedLines: number;
  lineCredit: number;
  equipmentCredit: number;
  wantsEquipment: boolean;
};

/** Resultado completo del motor — una tarjeta por plan del catálogo. */
export type OfferGenerationResult = {
  saleType: OfferSaleType;
  requestedLines: number;
  lineCredit: number;
  equipmentCredit: number;
  wantsEquipment: boolean;
  alternatives: OfferPlanAlternative[];
  viableCount: number;
};

export type OfferSimulationRecord = OfferGenerationResult & {
  id: string;
  leadId: string;
  companyId: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  recommendationJson: OfferGenerationResult;
};

export type OfferSimulationHistoryItem = {
  id: string;
  createdAt: string;
  saleType: OfferSaleType;
  requestedSummary: string;
  resultSummary: string;
  viableCount: number;
};
