import type { CommercialPlan } from "@/types/commercial-config";
import type { SaveLeadInput } from "@/types/lead";
import { DELIVERY_TYPE_LABELS } from "@/types/lead";
import { regionName } from "@/data/chile-regions";
import { formatLongDate } from "@/lib/format";
import { resolvePickupStore } from "@/lib/sales-script/teleprompter/delivery-config";
import { normalizeLineaNuevaDeliveryCarrier } from "./delivery/linea-nueva-delivery-types";
import type {
  LineaNuevaEngineInput,
  LineaNuevaEquipoInfo,
  LineaNuevaFlowVariant,
  LineaNuevaScriptContext,
} from "./linea-nueva-types";

export const LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY = "LINEA_NUEVA_SIN_EQUIPO" as const;
export const LINEA_NUEVA_SIN_EQUIPO_FLOW_TITLE =
  "Script de cierre Línea Nueva sin equipo" as const;

function planById(planId: string, plans: CommercialPlan[]): CommercialPlan | null {
  return plans.find((p) => p.id === planId) ?? null;
}

function resolveVariant(gestion: SaveLeadInput): LineaNuevaFlowVariant {
  const hasEquipment = gestion.lines.some((l) => l.equipmentMode === "with");
  if (hasEquipment) return "con_equipo";
  return "sin_equipo";
}

function mapEquipmentLines(gestion: SaveLeadInput): LineaNuevaEquipoInfo[] {
  return gestion.lines
    .map((line, index) => {
      if (line.equipmentMode !== "with") return null;
      return {
        equipmentId: line.equipmentCatalogId ?? "",
        brand: "",
        model: line.equipmentModel ?? "",
        color: "",
        memory: "",
        commercialText: line.equipmentCommercialText ?? "",
        downPayment: line.equipmentDownPayment ?? "",
        installments: line.equipmentInstallments ?? "",
        installmentValue: line.equipmentInstallmentValue ?? "",
        equipmentValue: line.equipmentValue ?? "",
        isPieCero: false,
        lineIndex: index,
      };
    })
    .filter((row): row is LineaNuevaEquipoInfo => row !== null);
}

/**
 * Adaptador de entrada → LineaNuevaScriptContext.
 * Solo mapeo estructural; sin textos ni reglas comerciales.
 *
 * TODO (LINEA NUEVA):
 * Pendiente implementación desde el documento oficial
 * "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
 * No implementar templateVars ni pricing hasta realizar la auditoría documental.
 */
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

export function buildLineaNuevaScriptContext(
  input: LineaNuevaEngineInput,
): LineaNuevaScriptContext {
  const { gestion, gestionId, commercialPlans, advisor, deliveryConfig } = input;
  const variant = resolveVariant(gestion);
  const equipos = mapEquipmentLines(gestion);
  const mainLine = gestion.lines[0];
  const deliveryType = mainLine?.deliveryType ?? "";
  const regionLabel = mainLine?.region ? regionName(mainLine.region) : "";
  const pickupStore =
    deliveryType === "store" && deliveryConfig
      ? resolvePickupStore(deliveryConfig, mainLine?.pickupStoreId ?? null)
      : null;
  const deliveryDate = formatLongDate(addBusinessDays(new Date(), 5).toISOString());
  const carrier = normalizeLineaNuevaDeliveryCarrier(mainLine?.deliveryCarrier);

  const lineas = gestion.lines.map((line, index) => {
    const catalogPlan = planById(line.planId, commercialPlans);
    return {
      index,
      phone: line.phone,
      planId: line.planId,
      planName: catalogPlan?.name ?? line.planId,
      isMain: index === 0,
      hasEquipment: line.equipmentMode === "with",
    };
  });

  const planes = gestion.lines.map((line, index) => {
    const catalogPlan = planById(line.planId, commercialPlans);
    return {
      planId: line.planId,
      planName: catalogPlan?.name ?? line.planId,
      catalogPlan,
      isMainLine: index === 0,
      lineIndex: index,
    };
  });

  const mainPlan = planes[0]?.catalogPlan ?? null;

  return {
    flowKey:
      variant === "sin_equipo"
        ? LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY
        : `LINEA_NUEVA_${variant.toUpperCase()}`,
    flowTitle: LINEA_NUEVA_SIN_EQUIPO_FLOW_TITLE,
    variant,
    lead: {
      conversationId: gestion.conversationId,
      gestionId,
    },
    cliente: {
      nombre: gestion.customerName,
      rut: gestion.rut,
      telefono: gestion.phone,
      email: mainLine?.email ?? "",
      region: mainLine?.region ?? "",
      comuna: mainLine?.comuna ?? "",
      direccion: mainLine?.deliveryAddress ?? "",
    },
    venta: {
      saleType: "new_line",
      variant,
      lineCount: gestion.lines.length,
      hasEquipment: equipos.length > 0,
      accountModality: mainLine?.accountType === "prepaid" ? "prepaid" : "postpaid",
      notes: gestion.notes ?? "",
    },
    planes,
    lineas,
    equipo: equipos[0] ?? null,
    equipos,
    despacho: {
      tipo:
        deliveryType === "home"
          ? "domicilio"
          : deliveryType === "store"
            ? "tienda"
            : "otro",
      tipoLabel: deliveryType ? (DELIVERY_TYPE_LABELS[deliveryType] ?? deliveryType) : "",
      fechaEntrega: deliveryDate,
      tiendaNombre: pickupStore?.name ?? "",
      tiendaDireccion: pickupStore?.address ?? "",
      tiendaHorario: pickupStore?.schedule ?? "",
      direccionEntrega: mainLine?.deliveryAddress ?? "",
      region: regionLabel,
      comuna: mainLine?.comuna ?? "",
      contactPhones: gestion.phone ? [gestion.phone] : [],
      carrier,
      isUltraExpress: false,
    },
    promociones: {
      freeBillNumbers: [],
      hasFreeBills: false,
      hasHandsetCoupon: false,
      hasFreeDeviceInstallments: false,
      hasPedidosYaPlus: false,
      labels: [],
    },
    usuario: {
      advisorId: advisor?.id ?? "",
      advisorName: advisor?.name ?? "",
      advisorEmail: advisor?.email ?? "",
    },
    templateVars: {},
    lineDetails: [],
    mainPlan,
    totalMonthly: 0,
    numeroNuevo: mainLine?.phone ?? "",
    folioMat: "",
    sourceGestion: gestion,
    commercialPlans: input.commercialPlans,
  };
}

export class LineaNuevaContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LineaNuevaContextError";
  }
}
