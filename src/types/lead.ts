/** Tipificación de la gestión. */
export type LeadType =
  | "venta"
  | "consulta"
  | "seguimiento"
  | "no_interesado"
  | "pendiente"
  | "reagenda"
  | "informacion"
  | "otro";

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  venta: "Venta",
  consulta: "Consulta",
  seguimiento: "Seguimiento",
  no_interesado: "No interesado",
  pendiente: "Pendiente",
  reagenda: "Reagenda",
  informacion: "Información",
  otro: "Otro",
};

/** Tipo de venta disponible dentro de una gestión de Venta. */
export type LeadSaleType = "portability" | "renewal" | "migration" | "new_line";

export const LEAD_SALE_TYPE_LABELS: Record<LeadSaleType, string> = {
  portability: "Portabilidad",
  renewal: "Renovación",
  migration: "Migración",
  new_line: "Línea Nueva",
};

/** Tipos de venta en los que el campo "Equipo" aplica (se muestra). */
export const EQUIPMENT_LEAD_TYPES: LeadSaleType[] = ["portability", "renewal"];

export type LineAccountType = "prepaid" | "postpaid";

export const LINE_ACCOUNT_TYPE_LABELS: Record<LineAccountType, string> = {
  prepaid: "Prepago",
  postpaid: "Postpago",
};

export type EquipmentMode = "none" | "with";

export type CurrentOperator =
  | "claro"
  | "movistar"
  | "entel"
  | "wom"
  | "virgin"
  | "vtr"
  | "gtd"
  | "other";

export type DeliveryType = "home" | "store";

export const EQUIPMENT_MODE_LABELS: Record<EquipmentMode, string> = {
  none: "Sin equipo",
  with: "Con equipo",
};

export const CURRENT_OPERATOR_LABELS: Record<CurrentOperator, string> = {
  claro: "Claro",
  movistar: "Movistar",
  entel: "Entel",
  wom: "WOM",
  virgin: "Virgin",
  vtr: "VTR",
  gtd: "GTD",
  other: "Otro",
};

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  home: "Despacho a domicilio",
  store: "Retiro en tienda",
};

/** Plan comercial visible para asesoras (sin Valor DuMo). */
export interface Plan {
  id: string;
  name: string;
  /** Precio WOM al cliente final. */
  womValue?: number;
}

/** Una línea vendida dentro de la gestión. */
export interface LeadSaleLine {
  id: string;
  phone: string;
  saleType: LeadSaleType;
  planId: string;
  equipment: string;
  equipmentMode?: EquipmentMode | "";
  currentOperator?: CurrentOperator | "";
  deliveryType?: DeliveryType | "";
  email?: string;
  deliveryAddress?: string;
  region?: string;
  comuna?: string;
  equipmentCatalogId?: string;
  equipmentModel?: string;
  equipmentValue?: string;
  equipmentDownPayment?: string;
  equipmentInstallments?: string;
  equipmentInstallmentValue?: string;
  equipmentCommercialText?: string;
}

/** Registro de gestión guardado. */
export interface Lead {
  id: string;
  conversationId: string;
  phone: string;
  customerName: string;
  rut: string;
  status: string;
  advisorId: string;
  type: string;
  notes: string;
  createdAt: string;
}

/** Última gestión guardada — precarga el formulario al abrir la conversación. */
export type LatestGestionDraft = {
  gestionId: string;
  customerName: string;
  rut: string;
  type: string;
  notes: string;
  lines: SaveLeadInput["lines"];
  hasScript: boolean;
};

/** Payload que la UI envía para guardar una gestión. */
export interface SaveLeadInput {
  conversationId: string;
  phone: string;
  customerName: string;
  rut: string;
  /** Slug de tipificación (ej. "venta", "seguimiento"). */
  type: string;
  notes: string;
  lines: {
    phone: string;
    saleType: LeadSaleType;
    planId: string;
    equipment: string;
    equipmentMode: EquipmentMode | "";
    currentOperator: CurrentOperator | "";
    deliveryType: DeliveryType | "";
    email: string;
    deliveryAddress: string;
    region: string;
    comuna: string;
    equipmentCatalogId: string;
    equipmentModel: string;
    equipmentValue: string;
    equipmentDownPayment: string;
    equipmentInstallments: string;
    equipmentInstallmentValue: string;
    equipmentCommercialText: string;
    /** Prepago → postpago: activa bloque CAP en portabilidad. */
    accountType?: LineAccountType;
    /** Transportista logístico — obligatorio para Bloque 6 domicilio. */
    deliveryCarrier?: "ALAS" | "SROUTE" | "CHILEPARCEL" | "NOMAD" | "";
    /** Sucursal WOM para retiro en tienda. */
    pickupStoreId?: string;
    /** Homologación / upselling (doc oficial línea 14). */
    isUpselling?: boolean;
  }[];
  /** Registra la venta en Mis Ventas (botón superior). Por defecto solo guarda gestión/script. */
  registerSale?: boolean;
  /** Acción del formulario: tipificar, generar script o registrar venta. */
  saveAction?: import("@/types/crm-client").SaveLeadAction;
}
