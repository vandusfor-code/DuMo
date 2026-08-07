/** Tipo de venta del motor comercial WOM. */
export type OfferSaleType =
  | "portability_postpaid"
  | "portability_prepaid"
  | "new_line";

/** Valor legacy almacenado antes de separar postpago / prepago. */
export type LegacyOfferSaleType = "portability";

export const OFFER_SALE_TYPE_LABELS: Record<OfferSaleType, string> = {
  portability_postpaid: "Portabilidad Postpago",
  portability_prepaid: "Portabilidad Prepago → Postpago",
  new_line: "Línea Nueva",
};

export const PREPAID_PORTABILITY_INFO_MESSAGE =
  "Cliente Prepago → Postpago. En este tipo de venta únicamente se evalúan planes móviles. No aplica financiación de equipos.";

export function normalizeOfferSaleType(saleType: string): OfferSaleType {
  if (saleType === "portability") return "portability_postpaid";
  if (
    saleType === "portability_postpaid" ||
    saleType === "portability_prepaid" ||
    saleType === "new_line"
  ) {
    return saleType;
  }
  return "portability_postpaid";
}

export function getOfferSaleTypeLabel(saleType: string): string {
  return OFFER_SALE_TYPE_LABELS[normalizeOfferSaleType(saleType)];
}

/** Tipos que evalúan catálogo de equipos y cupo equipo. */
export function offerSaleTypeUsesEquipment(saleType: OfferSaleType | string): boolean {
  const normalized = normalizeOfferSaleType(saleType);
  return normalized === "portability_postpaid" || normalized === "new_line";
}

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
  equipmentCredit?: number;
  wantsEquipment?: boolean;
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
  /** Mensaje informativo Prepago → Postpago (Regla 8). */
  prepaidInfoMessage?: string;
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
