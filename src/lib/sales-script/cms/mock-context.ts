import { COMMERCIAL_PLANS_MOCK } from "@/data/mock/commercial-config.mock";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "@/data/defaults/delivery-stores.default";
import { buildScriptContext } from "@/lib/sales-script/context";
import { buildLineaNuevaScriptContext } from "@/lib/sales-script/linea-nueva/linea-nueva-context";
import type { SaveLeadInput } from "@/types/lead";
import type { ScriptBuildContext } from "@/lib/sales-script/context";
import type { LineaNuevaEngineInput, LineaNuevaScriptContext } from "@/lib/sales-script/linea-nueva/linea-nueva-types";

export const CMS_PREVIEW_VARS: Record<string, string> = {
  saludo: "Buenas tardes",
  nombre_cliente: "María González",
  cliente_nombre: "María González",
  cliente_primer_nombre: "María",
  rut: "12.345.678-9",
  telefono: "+56 9 8765 4321",
  correo: "maria.gonzalez@correo.cl",
  direccion: "Av. Providencia 123",
  direccion_completa: "Av. Providencia 123, Providencia, Región Metropolitana",
  region: "Región Metropolitana",
  comuna: "Providencia",
  fecha_contratacion: "7 de agosto de 2026",
  fecha_venta: "7 de agosto de 2026",
  fecha: "7 de agosto de 2026",
  tipo_venta: "Portabilidad",
  numero_portar: "+56 9 8765 4321",
  numero_nuevo: "+56 9 1111 2222",
  linea_principal: "+56 9 8765 4321",
  operador_actual: "Movistar",
  plan: "Plan O",
  valor_plan: "$13.990",
  beneficios: "WhatsApp Libre, 80 GB y Club WOM",
  promociones: "2 meses con 50% de descuento",
  promociones_lista: "2 meses con 50% de descuento",
  resumen_multilinea: "",
  lineas: "1",
  cantidad_lineas: "1",
  cantidad_lineas_adicionales: "0",
  valor_linea_principal: "$13.990",
  valor_linea_adicional: "$7.990",
  valor_total: "$13.990",
  total_mensual: "$13.990",
  gb: "80 GB",
  roaming: "WhatsApp Libre",
  apps_libres: "Sí",
  club_wom: "Sí",
  pedidosya: "Sí",
  cupon_equipos: "No",
  cuotas_gratis: "",
  equipo: "",
  pie: "",
  cuotas: "",
  valor_cuota: "",
  valor_equipo_total: "",
  valor_total_equipo: "",
  caracteristicas_equipo: "",
  fecha_entrega: "14 de agosto de 2026",
  tipo_entrega: "Despacho a domicilio",
  nombre_sucursal: "WOM Costanera Center",
  direccion_sucursal: "Av. Andrés Bello 2425, Providencia",
  horario_sucursal: "Lunes a domingo 10:00 a 20:00 hrs",
  codigo_retiro: "WOM-ABC123",
  correo_ejecutivo: "carolina.perez@ventas.wom.cl",
  nombre_ejecutivo: "Carolina Pérez",
  ejecutivo: "Carolina Pérez",
  observaciones: "",
  condiciones_especiales: "",
};

const CMS_PLANS = COMMERCIAL_PLANS_MOCK.filter((p) => p.id === "plan-o");
const CMS_ADVISOR = { id: "adv-cms", name: "Carolina Pérez", email: "carolina.perez@ventas.wom.cl" };

function portabilidadGestion(): SaveLeadInput {
  return {
    conversationId: "conv-cms-port",
    phone: "56912345678",
    customerName: CMS_PREVIEW_VARS.nombre_cliente,
    rut: CMS_PREVIEW_VARS.rut,
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56987654321",
        saleType: "portability",
        planId: "plan-o",
        equipment: "",
        equipmentMode: "none",
        currentOperator: "movistar",
        deliveryType: "home",
        email: CMS_PREVIEW_VARS.correo,
        deliveryAddress: CMS_PREVIEW_VARS.direccion,
        region: "metropolitana",
        comuna: CMS_PREVIEW_VARS.comuna,
        equipmentCatalogId: "",
        equipmentModel: "",
        equipmentValue: "",
        equipmentDownPayment: "",
        equipmentInstallments: "",
        equipmentInstallmentValue: "",
        equipmentCommercialText: "",
        accountType: "postpaid",
      },
    ],
  };
}

function lineaNuevaGestion(): SaveLeadInput {
  return {
    conversationId: "conv-cms-ln",
    phone: "56912345678",
    customerName: CMS_PREVIEW_VARS.nombre_cliente,
    rut: CMS_PREVIEW_VARS.rut,
    type: "venta",
    notes: "",
    lines: [
      {
        phone: "56911112222",
        saleType: "new_line",
        planId: "plan-o",
        equipment: "",
        equipmentMode: "none",
        currentOperator: "",
        deliveryType: "home",
        email: CMS_PREVIEW_VARS.correo,
        deliveryAddress: CMS_PREVIEW_VARS.direccion,
        region: "metropolitana",
        comuna: CMS_PREVIEW_VARS.comuna,
        equipmentCatalogId: "",
        equipmentModel: "",
        equipmentValue: "",
        equipmentDownPayment: "",
        equipmentInstallments: "",
        equipmentInstallmentValue: "",
        equipmentCommercialText: "",
        accountType: "postpaid",
      },
    ],
  };
}

export function buildCmsPortabilidadContext(): ScriptBuildContext {
  const ctx = buildScriptContext({
    gestion: portabilidadGestion(),
    commercialPlans: CMS_PLANS,
    advisor: CMS_ADVISOR,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  });
  if (!ctx) {
    throw new Error("No se pudo construir contexto CMS de Portabilidad.");
  }
  return ctx;
}

export function buildCmsLineaNuevaInput(): LineaNuevaEngineInput {
  return {
    gestionId: "gest-cms-ln",
    gestion: lineaNuevaGestion(),
    commercialPlans: CMS_PLANS,
    advisor: CMS_ADVISOR,
    deliveryConfig: DEFAULT_DELIVERY_TELEPROMPTER_CONFIG,
  };
}

export function buildCmsLineaNuevaContext(): LineaNuevaScriptContext {
  return buildLineaNuevaScriptContext(buildCmsLineaNuevaInput());
}

export function previewVarsFromContext(ctx: ScriptBuildContext): Record<string, string> {
  return { ...CMS_PREVIEW_VARS, ...ctx.vars };
}

export function previewVarsForLineaNueva(): Record<string, string> {
  return {
    ...CMS_PREVIEW_VARS,
    tipo_venta: "Línea Nueva",
    numero_nuevo: CMS_PREVIEW_VARS.numero_nuevo,
  };
}
