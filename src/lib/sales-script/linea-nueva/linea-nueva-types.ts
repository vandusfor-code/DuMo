import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import type { SalesScriptBranch, SalesScriptStep } from "@/types/sales-script";
import type { LineSpeechDetail } from "@/lib/sales-script/teleprompter/speech-builders";
import type { LineaNuevaDeliveryCarrier } from "./delivery/linea-nueva-delivery-types";

/** Variantes futuras del flujo Línea Nueva (sin modificar el motor). */
export type LineaNuevaFlowVariant =
  | "sin_equipo"
  | "con_equipo"
  | "renovacion"
  | "migracion"
  | "prepago"
  | "fibra";

export type LineaNuevaLeadInfo = {
  conversationId: string;
  gestionId: string;
};

export type LineaNuevaClienteInfo = {
  nombre: string;
  rut: string;
  telefono: string;
  email: string;
  region: string;
  comuna: string;
  direccion: string;
};

export type LineaNuevaVentaInfo = {
  saleType: "new_line";
  variant: LineaNuevaFlowVariant;
  lineCount: number;
  hasEquipment: boolean;
  accountModality: "postpaid" | "prepaid";
  notes: string;
};

export type LineaNuevaPlanInfo = {
  planId: string;
  planName: string;
  catalogPlan: CommercialPlan | null;
  isMainLine: boolean;
  lineIndex: number;
};

export type LineaNuevaLineaInfo = {
  index: number;
  phone: string;
  planId: string;
  planName: string;
  isMain: boolean;
  hasEquipment: boolean;
};

export type LineaNuevaEquipoInfo = {
  equipmentId: string;
  brand: string;
  model: string;
  color: string;
  memory: string;
  commercialText: string;
  downPayment: string;
  installments: string;
  installmentValue: string;
  equipmentValue: string;
  isPieCero: boolean;
  lineIndex: number;
};

export type LineaNuevaDespachoTipo = "domicilio" | "tienda" | "otro";

export type LineaNuevaDespachoInfo = {
  tipo: LineaNuevaDespachoTipo;
  tipoLabel: string;
  fechaEntrega: string;
  tiendaNombre: string;
  tiendaDireccion: string;
  tiendaHorario: string;
  direccionEntrega: string;
  region: string;
  comuna: string;
  contactPhones: string[];
  carrier: LineaNuevaDeliveryCarrier | null;
  isUltraExpress: boolean;
};

export type LineaNuevaPromocionesInfo = {
  freeBillNumbers: number[];
  hasFreeBills: boolean;
  hasHandsetCoupon: boolean;
  hasFreeDeviceInstallments: boolean;
  hasPedidosYaPlus: boolean;
  labels: string[];
};

export type LineaNuevaUsuarioInfo = {
  advisorId: string;
  advisorName: string;
  advisorEmail: string;
};

/**
 * Contexto completo del Script Línea Nueva.
 * Toda decisión comercial del motor debe leer únicamente este objeto.
 */
export type LineaNuevaScriptContext = {
  flowKey: string;
  flowTitle: string;
  variant: LineaNuevaFlowVariant;
  lead: LineaNuevaLeadInfo;
  cliente: LineaNuevaClienteInfo;
  venta: LineaNuevaVentaInfo;
  planes: LineaNuevaPlanInfo[];
  lineas: LineaNuevaLineaInfo[];
  /** null cuando la venta es sin equipo. */
  equipo: LineaNuevaEquipoInfo | null;
  equipos: LineaNuevaEquipoInfo[];
  despacho: LineaNuevaDespachoInfo;
  promociones: LineaNuevaPromocionesInfo;
  usuario: LineaNuevaUsuarioInfo;
  /** Variables de plantilla resueltas para el discurso. */
  templateVars: Record<string, string>;
  /** Detalle comercial por línea — pricing y beneficios. */
  lineDetails: LineSpeechDetail[];
  /** Plan principal (línea 1). */
  mainPlan: CommercialPlan | null;
  /** Total mensual transparente según Oferta Comercial. */
  totalMonthly: number;
  /** Número nuevo asignado (línea principal). */
  numeroNuevo: string;
  /** Folio MAT — orientación interna para prefijo 809. */
  folioMat: string;
  /** Entrada cruda de gestión — solo para adaptadores; el motor no debe depender de ella. */
  sourceGestion: SaveLeadInput;
  /** Catálogo comercial usado para pricing y beneficios. */
  commercialPlans: CommercialPlan[];
};

/** Identificadores de bloques del script oficial Línea Nueva sin equipo. */
export type LineaNuevaSectionId =
  | "introduccion"
  | "audio"
  | "resumen_venta"
  | "beneficios"
  | "condiciones"
  | "despacho"
  | "compatibilidad"
  | "chip_prepago"
  | "encuesta"
  | "vdi"
  | "prefijo_809"
  | "referido"
  | "despedida";

export type LineaNuevaScriptSection = {
  id: LineaNuevaSectionId;
  label: string;
  content: string;
  order: number;
  skipped: boolean;
  skipReason?: string;
  branch?: SalesScriptBranch;
};

export type LineaNuevaScriptOutput = {
  flowKey: string;
  flowTitle: string;
  variant: LineaNuevaFlowVariant;
  sections: LineaNuevaScriptSection[];
  /** Adaptador al teleprompter existente en DuMo. */
  steps: SalesScriptStep[];
};

export type LineaNuevaValidationError = {
  code: string;
  message: string;
  field?: string;
};

export type LineaNuevaValidationResult =
  | { ok: true }
  | { ok: false; errors: LineaNuevaValidationError[] };

export type LineaNuevaRuleCategory =
  | "tipo_venta"
  | "cantidad_lineas"
  | "lineas_adicionales"
  | "promocion"
  | "boleta_cero"
  | "tipo_despacho"
  | "tipo_plan"
  | "beneficios";

/** Tier comercial del plan principal — W | O | M | otro. */
export type LineaNuevaPlanTier = "W" | "O" | "M" | "unknown";

/** Flags derivados del rule engine — el builder consume solo esto. */
export type LineaNuevaRuleFlags = {
  includeBeneficios: boolean;
  includeDespacho: boolean;
  includeCompatibilidad: boolean;
  includeChipPrepago: boolean;
  includeEncuesta: boolean;
  includeVdi: boolean;
  includePrefijo809: boolean;
  includeReferido: boolean;
  includeCondiciones: boolean;
  additionalLineCount: number;
  hasFreeBills: boolean;
  hasAdditionalLines: boolean;
  planTier: LineaNuevaPlanTier;
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
};

export type LineaNuevaRuleEvaluation = {
  flags: LineaNuevaRuleFlags;
  matchedRuleIds: string[];
  skippedRuleIds: string[];
};

export type LineaNuevaRule = {
  id: string;
  category: LineaNuevaRuleCategory;
  description: string;
  priority: number;
  when: (ctx: LineaNuevaScriptContext) => boolean;
  apply: (ctx: LineaNuevaScriptContext) => Partial<LineaNuevaRuleFlags>;
};

import type { LineaNuevaScriptBuilder } from "./linea-nueva-builder";

export type LineaNuevaSectionModule = {
  id: LineaNuevaSectionId;
  label: string;
  register: (input: {
    ctx: LineaNuevaScriptContext;
    flags: LineaNuevaRuleFlags;
    builder: LineaNuevaScriptBuilder;
  }) => void;
};

export type LineaNuevaEngineInput = {
  gestionId: string;
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  advisor?: { id: string; name: string; email: string };
  /** Config sucursales — requerido para retiro en tienda (Bloque 6). */
  deliveryConfig?: import("@/lib/sales-script/teleprompter/delivery-config").DeliveryTeleprompterConfig;
};
