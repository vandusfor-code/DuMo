/** Tipo de venta del motor de oferta (subset comercial). */
export type OfferSaleType = "portability" | "new_line";

export const OFFER_SALE_TYPE_LABELS: Record<OfferSaleType, string> = {
  portability: "Portabilidad",
  new_line: "Línea Nueva",
};

export type OfferSimulationStatus = "APPROVED" | "OPTIMIZED" | "REJECTED";

export type OfferOptimizationType =
  | "NONE"
  | "REMOVE_EQUIPMENT"
  | "REDUCE_LINES"
  | "REMOVE_EQUIPMENT_AND_REDUCE_LINES";

export type OfferPlanSnapshot = {
  planId: string;
  planName: string;
  fixedCharge: number;
};

export type OfferEquipmentSnapshot = {
  equipmentId: string;
  commercialName: string;
  brand: string;
  model: string;
  color?: string;
  totalValue: number;
  downPayment: number;
  installmentsCount: number;
  installmentValue: number;
} | null;

export type OfferSimulationRequest = {
  leadId: string;
  saleType: OfferSaleType;
  requestedLines: number;
  mainPlanId: string;
  additionalPlans: { planId: string }[];
  equipmentId: string | null;
  lineCredit: number;
  equipmentCredit: number;
};

export type OfferRecommendation = {
  id?: string;
  approved: boolean;
  reason: string;
  requestedLines: number;
  approvedLines: number;
  requestedEquipment: boolean;
  approvedEquipment: boolean;
  requestedMonthlyValue: number;
  approvedMonthlyValue: number;
  lineCredit: number;
  equipmentCredit: number;
  remainingCredit: number;
  removedEquipment: boolean;
  removedLines: number;
  status: OfferSimulationStatus;
  optimizationType: OfferOptimizationType;
  recommendation: string;
  requestedPlan: OfferPlanSnapshot & { additionalPlans: OfferPlanSnapshot[] };
  approvedPlan: OfferPlanSnapshot & { additionalPlans: OfferPlanSnapshot[] };
  requestedEquipmentDetail: OfferEquipmentSnapshot;
  approvedEquipmentDetail: OfferEquipmentSnapshot;
  rejectionReasons: string[];
};

export type OfferSimulationRecord = OfferRecommendation & {
  id: string;
  leadId: string;
  companyId: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  saleType: OfferSaleType;
  recommendationJson: OfferRecommendation;
};

export type OfferSimulationHistoryItem = {
  id: string;
  createdAt: string;
  saleType: OfferSaleType;
  requestedSummary: string;
  resultSummary: string;
  status: OfferSimulationStatus;
};
