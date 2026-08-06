/** Un paso del recorrido guiado del script de venta. */
export type SalesScriptStep = {
  id: string;
  title: string;
  /** Texto final con variables ya reemplazadas. Solo lectura para la asesora. */
  content: string;
};

export type StructuredScriptStep = {
  id: number;
  titulo: string;
  texto: string;
  variables: string[];
};

/** Representación estructurada persistida del script (no es un bloque de texto). */
export type StructuredScriptPayload = {
  tipo: string;
  pasos: StructuredScriptStep[];
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
  flowTitle: string;
  flowKey: string;
  meta: SalesScriptMeta;
  steps: SalesScriptStep[];
  structured: StructuredScriptPayload;
  createdAt: string;
};

export type SaveLeadResult = {
  lead: import("./lead").Lead;
  script: GeneratedSalesScript | null;
  /** Por qué no se generó script, si la gestión sí se guardó. */
  scriptUnavailableReason?: string | null;
};
