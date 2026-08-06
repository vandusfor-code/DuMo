/** Un bloque del teleprompter — discurso listo para leer en voz alta. */
export type SalesScriptStep = {
  id: string;
  /** Etiqueta discreta para orientar a la asesora — NO forma parte del discurso. */
  sectionLabel?: string;
  /** @deprecated Usar sectionLabel. Mantenido por compatibilidad con scripts persistidos. */
  title?: string;
  content: string;
  branch?: SalesScriptBranch;
};

export type SalesScriptBranch = {
  /** Discurso adicional si el cliente responde Sí (dudas, aclaraciones). */
  yesSpeech?: string;
  /** Discurso adicional si el cliente responde No (corrección, reconfirmación). */
  noSpeech?: string;
  /** Bloque Aceptación — ¿Te queda alguna duda con las condiciones? */
  condicionesDudas?: {
    yesSpeech: string;
  };
  /** Bloque Aceptación — ¿Lo aceptas? (VDI) */
  acceptance?: {
    noSpeech: string;
  };
  /** Solo Prepago → Postpago: ramificación CAP dentro del bloque Portabilidad. */
  cap?: {
    yesSpeech: string;
    noSpeech: string;
  };
  /** Prefijo 809 dentro del bloque Aceptación. */
  prefijo809?: {
    yesSpeech: string;
    noSpeech: string;
    followUpPrompt: string;
    followUpYesSpeech: string;
    followUpNoSpeech: string;
  };
};

export type StructuredScriptStep = {
  id: number;
  titulo: string;
  texto: string;
  variables: string[];
};

export type StructuredScriptPayload = {
  tipo: string;
  pasos: StructuredScriptStep[];
};

export type SalesScriptAdvisorSummary = {
  currentOperator: string;
  deliveryLabel: string;
  deliveryDate: string;
  lineCount: number;
  planValueLabel: string;
};

export type SalesScriptMeta = {
  clientName: string;
  saleTypeLabel: string;
  planName: string;
  totalMonthlyLabel: string;
  /** Prepago | Postpago — orientación interna en barra meta. */
  accountModalityLabel?: string;
  /** Resumen fijo para la asesora — no forma parte del discurso. */
  advisorSummary?: SalesScriptAdvisorSummary;
};

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
  scriptUnavailableReason?: string | null;
};
