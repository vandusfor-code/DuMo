import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import {
  CURRENT_OPERATOR_LABELS,
  DELIVERY_TYPE_LABELS,
  LEAD_SALE_TYPE_LABELS,
  type LeadSaleType,
} from "@/types/lead";
import { regionName } from "@/data/chile-regions";
import { computeContractSummary } from "@/lib/lead-contract-summary";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { chileGreetingWithComma } from "@/lib/sales-script/chile-time";
import { buildMultilineContractSpeech } from "@/lib/sales-script/multiline-contract";
import type { LeadLineValues } from "@/types/lead-form";
import type { Plan } from "@/types/lead";

export type ScriptBuildContext = {
  vars: Record<string, string>;
  mainLine: SaveLeadInput["lines"][number];
  lines: SaveLeadInput["lines"];
  hasEquipment: boolean;
  saleType: LeadSaleType;
  planDetail: CommercialPlan | null;
  requiresCapCode: boolean;
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
  lineCount: number;
  totalMonthly: number;
};

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
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return result;
}

function planById(planId: string, plans: CommercialPlan[]): CommercialPlan | null {
  return plans.find((p) => p.id === planId) ?? null;
}

function mapLineToFormLine(line: SaveLeadInput["lines"][number]): LeadLineValues {
  return {
    phone: line.phone,
    saleType: line.saleType,
    planId: line.planId,
    equipment: line.equipment,
    equipmentMode: line.equipmentMode,
    currentOperator: line.currentOperator,
    deliveryType: line.deliveryType,
    email: line.email,
    deliveryAddress: line.deliveryAddress,
    region: line.region,
    comuna: line.comuna,
    equipmentCatalogId: line.equipmentCatalogId,
    equipmentModel: line.equipmentModel,
    equipmentValue: line.equipmentValue,
    equipmentDownPayment: line.equipmentDownPayment,
    equipmentInstallments: line.equipmentInstallments,
    equipmentInstallmentValue: line.equipmentInstallmentValue,
    equipmentCommercialText: line.equipmentCommercialText,
  };
}

function buildPromotionsSpeech(promotions: string[]): string {
  if (promotions.length === 0) return "";
  const list = promotions.join(" y ");
  return `Además, cuentas con las promociones ${list}, aplicables en los meses correspondientes de tu facturación.`;
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function buildScriptContext(input: {
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  advisorPlans: Plan[];
  advisor?: { name: string; email: string };
}): ScriptBuildContext | null {
  const lines = input.gestion.lines;
  if (lines.length === 0) return null;

  const mainLine = lines[0];
  const saleType = mainLine.saleType;
  const planDetail = planById(mainLine.planId, input.commercialPlans);
  const advisorPlan = input.advisorPlans.find((p) => p.id === mainLine.planId);
  const planName = planDetail?.name ?? advisorPlan?.name ?? "Plan WOM";
  const planValue = planDetail?.womValue ?? advisorPlan?.womValue ?? 0;
  const additionalLineValue = planDetail?.additionalLineValue ?? 7_990;
  const summary = computeContractSummary(lines.map(mapLineToFormLine), input.advisorPlans);

  const specs = planDetail?.specs;
  const promotions = planDetail?.promotions ?? [];
  /** Beneficios solo desde catálogo comercial — nunca hardcodeados en el flujo. */
  const benefitsText = planDetail?.commercialText?.trim() ?? "";
  const promotionsSpeech = buildPromotionsSpeech(promotions);

  const regionLabel = mainLine.region ? regionName(mainLine.region) : "";
  const direccionCompleta = [mainLine.deliveryAddress, mainLine.comuna, regionLabel]
    .filter(Boolean)
    .join(", ");

  const multilineSpeech = buildMultilineContractSpeech({
    lineCount: lines.length,
    planName,
    mainValue: planValue,
    additionalLineValue,
    totalMonthly: summary.totalMonthly || planValue + additionalLineValue * Math.max(0, lines.length - 1),
  });

  const hasEquipment = lines.some((l) => l.equipmentMode === "with");
  const deliveryIsHome = mainLine.deliveryType === "home";
  const deliveryIsStore = mainLine.deliveryType === "store";
  const accountType = mainLine.accountType ?? "postpaid";
  const requiresCapCode =
    saleType === "portability" && accountType === "prepaid" && mainLine.currentOperator !== "wom";

  const deliveryDate = formatLongDate(addBusinessDays(new Date(), 5).toISOString());
  const clientName = input.gestion.customerName.trim();
  const clientFirst = firstName(clientName);
  const executiveName = input.advisor?.name?.trim() || "Ejecutivo WOM";

  const equipmentLine = lines.find((l) => l.equipmentMode === "with");
  const pie = equipmentLine?.equipmentDownPayment
    ? formatCurrency(Number(equipmentLine.equipmentDownPayment))
    : "";
  const cuotas = equipmentLine?.equipmentInstallments ?? "";
  const valorCuota = equipmentLine?.equipmentInstallmentValue
    ? formatCurrency(Number(equipmentLine.equipmentInstallmentValue))
    : "";
  const valorEquipo = equipmentLine?.equipmentValue
    ? formatCurrency(Number(equipmentLine.equipmentValue))
    : "";

  const totalMonthly = summary.totalMonthly || planValue;

  const vars: Record<string, string> = {
    saludo: chileGreetingWithComma(),
    nombre_cliente: clientName,
    cliente_nombre: clientName,
    cliente_primer_nombre: clientFirst,
    rut: input.gestion.rut,
    telefono: formatPhone569(input.gestion.phone),
    correo: mainLine.email || "",
    direccion: mainLine.deliveryAddress || "",
    direccion_completa: direccionCompleta,
    region: regionLabel,
    comuna: mainLine.comuna || "",
    fecha_contratacion: formatContractDate(new Date()),
    fecha_venta: formatContractDate(new Date()),
    fecha: formatContractDate(new Date()),
    tipo_venta: LEAD_SALE_TYPE_LABELS[saleType] ?? saleType,
    numero_portar: formatPhone569(mainLine.phone),
    linea_principal: formatPhone569(mainLine.phone),
    operador_actual: mainLine.currentOperator
      ? CURRENT_OPERATOR_LABELS[mainLine.currentOperator]
      : "",
    plan: planName,
    valor_plan: formatCurrency(planValue),
    beneficios: benefitsText,
    promociones: promotionsSpeech,
    promociones_lista: promotions.join(", "),
    resumen_multilinea: multilineSpeech,
    lineas: String(lines.length),
    cantidad_lineas: String(lines.length),
    cantidad_lineas_adicionales: String(Math.max(0, lines.length - 1)),
    valor_linea_principal: formatCurrency(planValue),
    valor_linea_adicional: formatCurrency(additionalLineValue),
    valor_total: formatCurrency(totalMonthly),
    total_mensual: formatCurrency(totalMonthly),
    gb: specs?.gb ?? "",
    roaming: specs?.roaming ?? "",
    apps_libres: specs?.appsLibres ?? "",
    club_wom: specs?.clubWom ?? "",
    pedidosya: specs?.pedidosYa ?? "",
    cupon_equipos: specs?.cuponEquipos ?? "",
    cuotas_gratis: specs?.cuotasGratis ?? "",
    equipo: equipmentLine?.equipment || equipmentLine?.equipmentModel || "",
    pie,
    cuotas,
    valor_cuota: valorCuota,
    valor_equipo_total: valorEquipo,
    valor_total_equipo: valorEquipo,
    caracteristicas_equipo: equipmentLine?.equipmentCommercialText || "",
    fecha_entrega: deliveryDate,
    tipo_entrega: mainLine.deliveryType
      ? DELIVERY_TYPE_LABELS[mainLine.deliveryType]
      : "",
    nombre_sucursal: "WOM Store Costanera Center",
    direccion_sucursal: "Av. Andrés Bello 2425, Providencia, Santiago",
    horario_sucursal: "Lunes a sábado de 10:00 a 20:00 hrs",
    codigo_retiro: "WOM-" + input.gestion.conversationId.slice(-6).toUpperCase(),
    correo_ejecutivo: input.advisor?.email || "asesor@ventas.wom.cl",
    nombre_ejecutivo: executiveName,
    ejecutivo: executiveName,
    observaciones: input.gestion.notes || "",
    condiciones_especiales: planDetail?.specialConditions || "",
  };

  return {
    vars,
    mainLine,
    lines,
    hasEquipment,
    saleType,
    planDetail,
    requiresCapCode,
    deliveryIsHome,
    deliveryIsStore,
    lineCount: lines.length,
    totalMonthly,
  };
}
