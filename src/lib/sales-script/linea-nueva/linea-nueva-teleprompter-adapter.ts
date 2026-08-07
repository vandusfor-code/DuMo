/**
 * Adaptador LN → builders transversales del teleprompter Portabilidad.
 * Solo mapeo de contexto; sin textos comerciales propios.
 */

import { regionName } from "@/data/chile-regions";
import { LEAD_SALE_TYPE_LABELS } from "@/types/lead";
import { formatCurrency, formatLongDate } from "@/lib/format";
import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { chileSaludoCompleto } from "@/lib/sales-script/chile-time";
import { computeTeleprompterMonthlyTotal } from "@/lib/sales-script/teleprompter/contract-pricing";
import { buildLineDetails } from "@/lib/sales-script/teleprompter/speech-builders";
import { formatFreeBillsLabels } from "@/lib/commercial-plan-offer";
import type { LineaNuevaScriptContext } from "./linea-nueva-types";

function formatPhone569(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 9) {
    const local = digits.slice(-9);
    return `569-${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return phone;
}

function formatContractDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return result;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function saludoScriptVarsFromLineaNueva(
  ctx: LineaNuevaScriptContext,
): Record<string, string> {
  const fullName = ctx.cliente.nombre.trim();
  const first = fullName.split(/\s+/)[0] ?? fullName;

  return {
    saludo: chileSaludoCompleto(),
    nombre_ejecutivo: ctx.usuario.advisorName.trim() || "tu ejecutivo WOM",
    nombre_cliente: fullName,
    cliente_primer_nombre: first,
  };
}

export function enrichLineaNuevaTeleprompterContext(
  ctx: LineaNuevaScriptContext,
): LineaNuevaScriptContext {
  const gestion = ctx.sourceGestion;
  const mainLine = gestion.lines[0];
  if (!mainLine) return ctx;

  const lineDetails = buildLineDetails({
    lines: gestion.lines,
    commercialPlans: ctx.commercialPlans,
  });

  const mainPlan = ctx.mainPlan;
  const totalMonthly =
    computeTeleprompterMonthlyTotal(lineDetails, mainPlan) ||
    lineDetails.reduce((sum, line) => sum + line.planValue, 0);

  const regionLabel = mainLine.region ? regionName(mainLine.region) : "";
  const direccionCompleta = [mainLine.deliveryAddress, mainLine.comuna, regionLabel]
    .filter(Boolean)
    .join(", ");

  const promoBillNumbers = new Set<number>();
  for (const line of lineDetails) {
    const freeBills = line.plan?.offer.freeBills;
    if (!freeBills || freeBills.billNumbers.length === 0) continue;
    const applies = line.isMain
      ? freeBills.appliesToMainLine
      : freeBills.appliesToAdditionalLines;
    if (applies) freeBills.billNumbers.forEach((n) => promoBillNumbers.add(n));
  }
  const promoLabels = formatFreeBillsLabels([...promoBillNumbers].sort((a, b) => a - b));

  const clientName = gestion.customerName.trim();
  const planName = mainPlan?.name ?? mainLine.planId;
  const planValue = mainPlan?.womValue ?? 0;
  const additionalLineValue = mainPlan?.additionalLineValue ?? 7_990;

  const templateVars: Record<string, string> = {
    ...saludoScriptVarsFromLineaNueva(ctx),
    rut: gestion.rut,
    telefono: formatPhone569(gestion.phone),
    correo: mainLine.email || ctx.cliente.email,
    direccion: mainLine.deliveryAddress || ctx.cliente.direccion,
    direccion_completa: direccionCompleta,
    region: regionLabel,
    comuna: mainLine.comuna || ctx.cliente.comuna,
    fecha_contratacion: formatContractDate(new Date()),
    fecha_venta: formatContractDate(new Date()),
    fecha: formatContractDate(new Date()),
    tipo_venta: LEAD_SALE_TYPE_LABELS.new_line,
    numero_portar: formatPhone569(mainLine.phone),
    numero_nuevo: formatPhone569(mainLine.phone),
    linea_principal: formatPhone569(mainLine.phone),
    operador_actual: "",
    plan: planName,
    valor_plan: formatCurrency(planValue),
    promociones: promoLabels.join(" y "),
    promociones_lista: promoLabels.join(", "),
    cantidad_lineas: String(gestion.lines.length),
    cantidad_lineas_adicionales: String(Math.max(0, gestion.lines.length - 1)),
    valor_linea_principal: formatCurrency(planValue),
    valor_linea_adicional: formatCurrency(additionalLineValue),
    valor_total: formatCurrency(totalMonthly),
    total_mensual: formatCurrency(totalMonthly),
    fecha_entrega: formatLongDate(addBusinessDays(new Date(), 5).toISOString()),
    correo_ejecutivo: ctx.usuario.advisorEmail || "asesor@ventas.wom.cl",
    nombre_ejecutivo: ctx.usuario.advisorName.trim() || "Ejecutivo WOM",
    carrier_despacho: ctx.despacho.carrier ?? "",
    nombre_sucursal: ctx.despacho.tiendaNombre,
    direccion_sucursal: ctx.despacho.tiendaDireccion,
    horario_sucursal: ctx.despacho.tiendaHorario,
    tipo_entrega: ctx.despacho.tipoLabel,
    ejecutivo: ctx.usuario.advisorName.trim() || "Ejecutivo WOM",
  };

  return {
    ...ctx,
    cliente: {
      ...ctx.cliente,
      email: mainLine.email || ctx.cliente.email,
      telefono: gestion.phone,
      direccion: mainLine.deliveryAddress || ctx.cliente.direccion,
      region: regionLabel,
      comuna: mainLine.comuna || ctx.cliente.comuna,
    },
    numeroNuevo: formatPhone569(mainLine.phone),
    lineDetails,
    totalMonthly,
    templateVars,
    promociones: {
      freeBillNumbers: [...promoBillNumbers],
      hasFreeBills: promoBillNumbers.size > 0,
      hasHandsetCoupon: Boolean(mainPlan?.offer.handsetCoupon?.enabled),
      hasFreeDeviceInstallments: Boolean(mainPlan?.offer.freeDeviceInstallments?.enabled),
      hasPedidosYaPlus: Boolean(mainPlan?.offer.pedidosYaPlus?.enabled),
      labels: promoLabels,
    },
    despacho: {
      ...ctx.despacho,
      fechaEntrega: ctx.despacho.fechaEntrega || formatLongDate(addBusinessDays(new Date(), 5).toISOString()),
      contactPhones: gestion.phone ? [formatPhone569(gestion.phone)] : ctx.despacho.contactPhones,
    },
  };
}

/** Contexto completo para builders transversales (Bloque 3+). */
export function buildScriptBuildContextFromLineaNueva(
  ctx: LineaNuevaScriptContext,
): ScriptBuildContext {
  const enriched = enrichLineaNuevaTeleprompterContext(ctx);
  const mainLine = enriched.sourceGestion.lines[0];

  return {
    vars: enriched.templateVars,
    mainLine,
    lines: enriched.sourceGestion.lines,
    hasEquipment: enriched.venta.hasEquipment,
    mainEquipment: null,
    equipmentLines: [],
    saleType: "new_line",
    planDetail: enriched.mainPlan,
    requiresCapCode: false,
    deliveryIsHome: enriched.despacho.tipo === "domicilio",
    deliveryIsStore: enriched.despacho.tipo === "tienda",
    contactPhones: enriched.despacho.contactPhones,
    isUltraExpressDelivery: enriched.despacho.isUltraExpress,
    lineCount: enriched.venta.lineCount,
    totalMonthly: enriched.totalMonthly,
    lineDetails: enriched.lineDetails,
    accountType: enriched.venta.accountModality,
  };
}

/**
 * Contexto mínimo para `buildBlock1SaludoSpeech`.
 * El builder congelado v1.0 solo lee `ctx.vars`.
 */
export function minimalScriptBuildContextForSaludo(
  ctx: LineaNuevaScriptContext,
): ScriptBuildContext {
  return {
    vars: saludoScriptVarsFromLineaNueva(ctx),
    mainLine: ctx.sourceGestion.lines[0],
    lines: ctx.sourceGestion.lines,
    hasEquipment: ctx.venta.hasEquipment,
    mainEquipment: null,
    equipmentLines: [],
    saleType: "new_line",
    planDetail: ctx.mainPlan,
    requiresCapCode: false,
    deliveryIsHome: ctx.despacho.tipo === "domicilio",
    deliveryIsStore: ctx.despacho.tipo === "tienda",
    contactPhones: ctx.despacho.contactPhones,
    isUltraExpressDelivery: ctx.despacho.isUltraExpress,
    lineCount: ctx.venta.lineCount,
    totalMonthly: ctx.totalMonthly,
    lineDetails: ctx.lineDetails,
    accountType: ctx.venta.accountModality,
  };
}
