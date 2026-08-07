import type { CommercialPlan } from "@/types/commercial-config";
import type { EquipmentCatalogItem } from "@/types/equipment";
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
import { chileSaludoCompleto } from "@/lib/sales-script/chile-time";
import {
  buildLineDetails,
  type LineSpeechDetail,
} from "@/lib/sales-script/teleprompter/speech-builders";
import { computeTeleprompterMonthlyTotal } from "@/lib/sales-script/teleprompter/contract-pricing";
import { DEFAULT_DELIVERY_TELEPROMPTER_CONFIG } from "@/data/defaults/delivery-stores.default";
import {
  type DeliveryTeleprompterConfig,
  resolvePickupStore,
} from "@/lib/sales-script/teleprompter/delivery-config";
import { getTeleprompterContextError } from "@/lib/sales-script/teleprompter/teleprompter-validation";
import { joinNaturalList } from "@/lib/sales-script/teleprompter/speech-utils";
import { resolveEquipmentIsPieCero } from "@/lib/equipment-catalog";
import { formatFreeBillsLabels } from "@/lib/commercial-plan-offer";
import { commercialPlansToAdvisorOptions } from "@/lib/commercial-plans-catalog";
import type { LeadLineValues } from "@/types/lead-form";

export type ScriptEquipmentLine = {
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
};

export type ScriptBuildContext = {
  vars: Record<string, string>;
  mainLine: SaveLeadInput["lines"][number];
  lines: SaveLeadInput["lines"];
  hasEquipment: boolean;
  /** Equipo principal de la venta (primera línea con equipo). Null si sin equipo. */
  mainEquipment: ScriptEquipmentLine | null;
  /** Todos los equipos asociados a las líneas de la venta, en orden de línea. */
  equipmentLines: ScriptEquipmentLine[];
  saleType: LeadSaleType;
  planDetail: CommercialPlan | null;
  requiresCapCode: boolean;
  deliveryIsHome: boolean;
  deliveryIsStore: boolean;
  /** Teléfonos de contacto para entrega — extensible cuando el CRM agregue un segundo. */
  contactPhones: string[];
  /** Despacho Ultra Express (NOMAD 3h) — preparado para variable futura en gestión. */
  isUltraExpressDelivery: boolean;
  lineCount: number;
  totalMonthly: number;
  lineDetails: LineSpeechDetail[];
  accountType: "prepaid" | "postpaid";
};

export { getTeleprompterContextError } from "@/lib/sales-script/teleprompter/teleprompter-validation";

function buildContactPhones(gestion: SaveLeadInput): string[] {
  const contact = formatPhone569(gestion.phone);
  return contact ? [contact] : [];
}

function resolveIsUltraExpressDelivery(
  _mainLine: SaveLeadInput["lines"][number],
): boolean {
  // Future: leer flag de gestión (p. ej. mainLine.deliverySpeed === "ultra_express").
  return false;
}

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
    accountType: line.accountType ?? "postpaid",
    isUpselling: line.isUpselling,
  };
}

function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function computeTotalMonthlyFromLines(lineDetails: LineSpeechDetail[]): number {
  return lineDetails.reduce((sum, line) => sum + line.planValue, 0);
}

function buildEquipmentLine(
  line: SaveLeadInput["lines"][number],
  equipmentCatalog: EquipmentCatalogItem[],
): ScriptEquipmentLine | null {
  if (line.equipmentMode !== "with") return null;

  const catalogItem = equipmentCatalog.find((item) => item.id === line.equipmentCatalogId);
  if (!catalogItem) return null;

  return {
    equipmentId: line.equipmentCatalogId,
    brand: catalogItem.brand,
    model: catalogItem.model,
    color: catalogItem.color ?? "",
    memory: catalogItem.memory ?? "",
    commercialText: line.equipmentCommercialText,
    downPayment: line.equipmentDownPayment,
    installments: line.equipmentInstallments,
    installmentValue: line.equipmentInstallmentValue,
    equipmentValue: line.equipmentValue,
    isPieCero: resolveEquipmentIsPieCero(catalogItem),
  };
}

function buildEquipmentLines(
  lines: SaveLeadInput["lines"],
  equipmentCatalog: EquipmentCatalogItem[],
): ScriptEquipmentLine[] {
  const result: ScriptEquipmentLine[] = [];
  for (const line of lines) {
    const equipmentLine = buildEquipmentLine(line, equipmentCatalog);
    if (equipmentLine) result.push(equipmentLine);
  }
  return result;
}

export function buildScriptContext(input: {
  gestion: SaveLeadInput;
  commercialPlans: CommercialPlan[];
  equipmentCatalog?: EquipmentCatalogItem[];
  advisor?: { name: string; email: string };
  deliveryConfig?: DeliveryTeleprompterConfig;
}): ScriptBuildContext | null {
  const deliveryConfig = input.deliveryConfig ?? DEFAULT_DELIVERY_TELEPROMPTER_CONFIG;
  const equipmentCatalog = input.equipmentCatalog ?? [];

  if (
    getTeleprompterContextError({
      gestion: input.gestion,
      commercialPlans: input.commercialPlans,
      equipmentCatalog,
      deliveryConfig,
    })
  ) {
    return null;
  }

  const lines = input.gestion.lines;
  if (lines.length === 0) return null;

  const mainLine = lines[0];
  const saleType = mainLine.saleType;
  const planDetail = planById(mainLine.planId, input.commercialPlans);
  if (!planDetail) return null;

  const planName = planDetail.name;
  const planValue = planDetail.womValue;
  const additionalLineValue = planDetail.additionalLineValue ?? 7_990;
  const advisorPlanOptions = commercialPlansToAdvisorOptions(input.commercialPlans);
  const summary = computeContractSummary(lines.map(mapLineToFormLine), advisorPlanOptions);

  const regionLabel = mainLine.region ? regionName(mainLine.region) : "";
  const direccionCompleta = [mainLine.deliveryAddress, mainLine.comuna, regionLabel]
    .filter(Boolean)
    .join(", ");

  const hasEquipment = lines.some((l) => l.equipmentMode === "with");
  const deliveryIsHome = mainLine.deliveryType === "home";
  const deliveryIsStore = mainLine.deliveryType === "store";
  const contactPhones = buildContactPhones(input.gestion);
  const isUltraExpressDelivery = resolveIsUltraExpressDelivery(mainLine);
  const pickupStore = deliveryIsStore ? resolvePickupStore(deliveryConfig, null) : null;
  const accountType = mainLine.accountType ?? "postpaid";
  const requiresCapCode =
    saleType === "portability" && accountType === "prepaid" && mainLine.currentOperator !== "wom";

  const deliveryDate = formatLongDate(addBusinessDays(new Date(), 5).toISOString());
  const clientName = input.gestion.customerName.trim();
  const clientFirst = firstName(clientName);
  const executiveName = input.advisor?.name?.trim() || "Ejecutivo WOM";

  const equipmentLine = lines.find((l) => l.equipmentMode === "with");
  const equipmentLines = buildEquipmentLines(lines, equipmentCatalog);
  const mainEquipment = equipmentLines[0] ?? null;
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

  const lineDetails = buildLineDetails({
    lines: input.gestion.lines,
    commercialPlans: input.commercialPlans,
  });

  const totalMonthly =
    computeTeleprompterMonthlyTotal(lineDetails, planDetail) ||
    summary.totalMonthly ||
    computeTotalMonthlyFromLines(lineDetails);
  const mainBenefitItems = lineDetails[0]?.benefitItems ?? [];
  const promoBillNumbers = new Set<number>();
  for (const line of lineDetails) {
    const freeBills = line.plan?.offer.freeBills;
    if (!freeBills || freeBills.billNumbers.length === 0) continue;
    const applies = line.isMain
      ? freeBills.appliesToMainLine
      : freeBills.appliesToAdditionalLines &&
        (saleType === "portability" || saleType === "new_line");
    if (applies) freeBills.billNumbers.forEach((n) => promoBillNumbers.add(n));
  }
  const promoLabels = formatFreeBillsLabels([...promoBillNumbers].sort((a, b) => a - b));

  const vars: Record<string, string> = {
    saludo: chileSaludoCompleto(),
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
    beneficios: joinNaturalList(mainBenefitItems),
    promociones: promoLabels.join(" y "),
    promociones_lista: promoLabels.join(", "),
    resumen_multilinea: "",
    lineas: String(lines.length),
    cantidad_lineas: String(lines.length),
    cantidad_lineas_adicionales: String(Math.max(0, lines.length - 1)),
    valor_linea_principal: formatCurrency(planValue),
    valor_linea_adicional: formatCurrency(additionalLineValue),
    valor_total: formatCurrency(totalMonthly),
    total_mensual: formatCurrency(totalMonthly),
    gb: planDetail?.offer.dataAllowance ?? "",
    roaming: planDetail?.offer.roamingWhatsapp
      ? planDetail.offer.roamingGb
        ? `WhatsApp + ${planDetail.offer.roamingGb} GB`
        : "WhatsApp Libre"
      : "",
    apps_libres: planDetail?.offer.freeApps ? "Sí" : "",
    club_wom: planDetail?.offer.clubWom ? "Sí" : "",
    pedidosya: planDetail?.offer.pedidosYaPlus?.enabled ? "Sí" : "",
    cupon_equipos: planDetail?.offer.handsetCoupon?.enabled ? "Sí" : "",
    cuotas_gratis: planDetail?.offer.freeDeviceInstallments?.enabled
      ? planDetail.offer.freeDeviceInstallments.installmentNumbers.join(", ")
      : "",
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
    nombre_sucursal: pickupStore?.name ?? "",
    direccion_sucursal: pickupStore?.address ?? "",
    horario_sucursal: pickupStore?.schedule ?? "",
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
    mainEquipment,
    equipmentLines,
    saleType,
    planDetail,
    requiresCapCode,
    deliveryIsHome,
    deliveryIsStore,
    contactPhones,
    isUltraExpressDelivery,
    lineCount: lines.length,
    totalMonthly,
    lineDetails,
    accountType,
  };
}
