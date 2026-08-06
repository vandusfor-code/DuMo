/** Un paso del recorrido guiado del script de venta. */
export type SalesScriptStep = {
  id: string;
  title: string;
  /** Texto final con variables ya reemplazadas. Solo lectura para la asesora. */
  content: string;
};

export type SalesScriptMeta = {
  clientName: string;
  saleTypeLabel: string;
  planName: string;
  totalMonthlyLabel: string;
};

/** Script generado automáticamente al guardar una gestión de venta. */
export type GeneratedSalesScript = {
  id: string;
  gestionId: string;
  conversationId: string;
  /** Ej: "PORTABILIDAD SIN EQUIPO" */
  flowTitle: string;
  flowKey: string;
  meta: SalesScriptMeta;
  steps: SalesScriptStep[];
  createdAt: string;
};

export type SaveLeadResult = {
  lead: import("./lead").Lead;
  script: GeneratedSalesScript | null;
};
