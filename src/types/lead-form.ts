import type {
  CurrentOperator,
  DeliveryType,
  EquipmentMode,
  LeadSaleType,
  LeadType,
} from "./lead";

export interface LeadLineValues {
  phone: string;
  saleType: LeadSaleType | "";
  planId: string;
  equipment: string;
  equipmentMode: EquipmentMode | "";
  currentOperator: CurrentOperator | "";
  deliveryType: DeliveryType | "";
  email: string;
  deliveryAddress: string;
  region: string;
  comuna: string;
  /** Catálogo admin — flujo "Con equipo". */
  equipmentCatalogId: string;
  equipmentModel: string;
  equipmentValue: string;
  equipmentDownPayment: string;
  equipmentInstallments: string;
  equipmentInstallmentValue: string;
  /** Texto comercial del catálogo (Asistente de Venta). */
  equipmentCommercialText: string;
}

/** Shape of the commercial-management form (React Hook Form). */
export interface LeadFormValues {
  customerName: string;
  rut: string;
  phone: string;
  type: LeadType;
  observations: string;
  internalNotes: string;
  lines: LeadLineValues[];
}

export const EMPTY_LEAD_LINE: LeadLineValues = {
  phone: "",
  saleType: "",
  planId: "",
  equipment: "",
  equipmentMode: "none",
  currentOperator: "",
  deliveryType: "",
  email: "",
  deliveryAddress: "",
  region: "",
  comuna: "",
  equipmentCatalogId: "",
  equipmentModel: "",
  equipmentValue: "",
  equipmentDownPayment: "",
  equipmentInstallments: "",
  equipmentInstallmentValue: "",
  equipmentCommercialText: "",
};
