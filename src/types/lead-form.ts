import type {
  CurrentOperator,
  DeliveryType,
  EquipmentMode,
  LeadSaleType,
  LeadType,
  LineAccountType,
} from "./lead";
import type { DuoSaleFormInput } from "./duo-sale";

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
  /** Modalidad línea actual — define si aplica bloque CAP (prepago → postpago). */
  accountType: LineAccountType | "";
  /** Homologación / upselling (doc oficial línea 14). */
  isUpselling?: boolean;
}

/** Shape of the commercial-management form (React Hook Form). */
export interface LeadFormValues {
  customerName: string;
  rut: string;
  phone: string;
  /** Operador (WOM/Claro) — decide qué catálogo de tipificaciones se muestra. */
  carrier: string;
  type: string;
  observations: string;
  internalNotes: string;
  /** yyyy-mm-dd — seguimiento al guardar y cerrar (P1.3). */
  followUpDate: string;
  lines: LeadLineValues[];
  /** Solo se usa/valida cuando type = "operacion_duo". */
  duo: DuoSaleFormInput;
  /** Radicado escrito por la asesora. Opcional salvo venta/Operación Duo. */
  folioNumber: string;
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
  accountType: "postpaid",
  isUpselling: false,
};
