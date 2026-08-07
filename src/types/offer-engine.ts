/** Tipo de venta del motor comercial (subset WOM). */
export type OfferSaleType = "portability" | "new_line";

export const OFFER_SALE_TYPE_LABELS: Record<OfferSaleType, string> = {
  portability: "Portabilidad",
  new_line: "Línea Nueva",
};

export type OfferEquipmentRef = {
  id: string;
  commercialName: string;
  brand: string;
  model: string;
  installmentValue: number;
  isPieCero: boolean;
};

/** Tarjeta comercial por plan evaluado automáticamente. */
export type PlanCommercialOffer = {
  rank: number;
  planId: string;
  planName: string;
  /** Solo informativo — nunca se usa en cálculos. */
  promotionalPrice: number | null;
  lines: number;
  mainLineFixedCharge: number;
  additionalLineUnitPrice: number;
  additionalLinesCount: number;
  additionalLinesTotal: number;
  planMonthlyTotal: number;
  lineCredit: number;
  lineConsumed: number;
  lineRemaining: number;
  equipmentCredit: number;
  wantsEquipment: boolean;
  maxEquipmentInstallment: number;
  eligibleEquipment: OfferEquipmentRef[];
  equipmentOnlyWithoutDevice: boolean;
  note?: string;
};

export type DiscardedPlan = {
  planId: string;
  planName: string;
  reason: string;
};

export type DiscardedEquipment = {
  id: string;
  label: string;
  installmentValue: number;
  reason: string;
};

export type OfferSimulationRequest = {
  leadId: string;
  saleType: OfferSaleType;
  requestedLines: number;
  lineCredit: number;
  equipmentCredit: number;
  wantsEquipment: boolean;
};

export type OfferGenerationResult = {
  saleType: OfferSaleType;
  requestedLines: number;
  evaluatedLines: number;
  lineCredit: number;
  equipmentCredit: number;
  wantsEquipment: boolean;
  optimized: boolean;
  optimizationMessage?: string;
  equipmentCreditZeroMessage?: string;
  offers: PlanCommercialOffer[];
  discardedPlans: DiscardedPlan[];
  discardedEquipment: DiscardedEquipment[];
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
