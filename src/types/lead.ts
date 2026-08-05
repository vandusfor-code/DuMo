/** Tipificación de la gestión (Tipo de gestión). */
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
}

/** Registro de gestión guardado. */
export interface Lead {
  id: string;
  conversationId: string;
  phone: string;
  customerName: string;
  rut: string;
  status: LeadType;
  advisorId: string;
  type: LeadType;
  notes: string;
  createdAt: string;
}

/** Payload que la UI envía para guardar una gestión. */
export interface SaveLeadInput {
  conversationId: string;
  phone: string;
  customerName: string;
  rut: string;
  type: LeadType;
  notes: string;
  lines: {
    phone: string;
    saleType: LeadSaleType;
    planId: string;
    equipment: string;
  }[];
}
