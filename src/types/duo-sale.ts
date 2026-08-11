/** Slug de la tipificación que abre el formulario de Operación Duo. */
export const DUO_TIPIFICATION_SLUG = "operacion_duo";

export type DuoSaleStatus = "pending_assignment" | "assigned" | "closed";

export const DUO_SALE_STATUS_LABELS: Record<DuoSaleStatus, string> = {
  pending_assignment: "Sin asignar",
  assigned: "Asignada",
  closed: "Cerrada",
};

/** Nota que deja la asesora de cierre mientras intenta contactar al cliente. */
export interface DuoClosingNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

/**
 * Campos capturados por la asesora que concreta por chat, específicos de
 * Operación Duo (full_name/rut/phone ya viven en la gestión estándar —
 * Información general — no se duplican aquí).
 */
export interface DuoSaleFormInput {
  currentCompany: string;
  email: string;
  region: string;
  comuna: string;
  street: string;
  houseNumber: string;
  plan: string;
  equipment: string;
  saleType: string;
  dispatch: string;
  dumoRegisteredName: string;
  callTime: string;
  comments: string;
}

export const EMPTY_DUO_SALE_FORM: DuoSaleFormInput = {
  currentCompany: "",
  email: "",
  region: "",
  comuna: "",
  street: "",
  houseNumber: "",
  plan: "",
  equipment: "",
  saleType: "",
  dispatch: "",
  dumoRegisteredName: "",
  callTime: "",
  comments: "",
};

export interface DuoSale extends DuoSaleFormInput {
  id: string;
  conversationId: string;
  gestionId: string | null;
  customerName: string;
  rut: string;
  phone: string;
  originAdvisorId: string;
  originAdvisorName: string;
  closingAdvisorId: string | null;
  closingAdvisorName: string | null;
  status: DuoSaleStatus;
  closingNotes: DuoClosingNote[];
  closedSaleId: string | null;
  assignedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export interface CreateDuoSaleInput extends DuoSaleFormInput {
  conversationId: string;
  gestionId: string | null;
  customerName: string;
  rut: string;
  phone: string;
  originAdvisorId: string;
  originAdvisorName: string;
}

/** DUO-4 — resultado del cierre: el caso actualizado + cuánto cobra cada asesora. */
export interface CloseDuoSaleResult {
  duoSale: DuoSale;
  saleId: string;
  originCommission: number;
  closingCommission: number;
}
