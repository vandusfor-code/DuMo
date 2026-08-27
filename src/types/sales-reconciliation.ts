/** Línea tal como quedó guardada en lead_gestiones.lines (jsonb). */
export interface OrphanGestionLine {
  phone: string;
  saleType: string;
  planId: string;
  equipment?: string;
  equipmentMode?: string;
  currentOperator?: string;
  deliveryType?: string;
  email?: string;
  deliveryAddress?: string;
  region?: string;
  comuna?: string;
  accountType?: string;
}

/** Gestión tipo "venta" que nunca generó una fila en `sales` (bug de saveAction, ya corregido). */
export interface OrphanSaleGestion {
  gestionId: string;
  conversationId: string;
  phone: string;
  customerName: string;
  rut: string;
  advisorId: string;
  advisorName: string;
  lines: OrphanGestionLine[];
  createdAt: string;
}

export type ReconciliationStatus = "registered" | "dismissed";
