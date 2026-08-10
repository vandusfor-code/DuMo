import type { LeadFormValues, LeadLineValues } from "@/types/lead-form";
import { EMPTY_LEAD_LINE } from "@/types/lead-form";
import type {
  CurrentOperator,
  DeliveryType,
  EquipmentMode,
  LeadSaleType,
  LeadType,
  LineAccountType,
  SaveLeadInput,
} from "@/types/lead";
import type { NewSaleInput, SaleType } from "@/types/sale";

const INTERNAL_NOTES_PREFIX = "\n\nNotas internas: ";

export function splitGestionNotes(notes: string): { observations: string; internalNotes: string } {
  const idx = notes.indexOf(INTERNAL_NOTES_PREFIX);
  if (idx === -1) return { observations: notes, internalNotes: "" };
  return {
    observations: notes.slice(0, idx),
    internalNotes: notes.slice(idx + INTERNAL_NOTES_PREFIX.length),
  };
}

/** Convierte líneas persistidas en JSONB al shape del formulario. */
export function mapStoredLinesToForm(
  lines: SaveLeadInput["lines"] | undefined,
): LeadLineValues[] {
  if (!lines?.length) return [{ ...EMPTY_LEAD_LINE }];
  return lines.map((line) => ({
    phone: line.phone ?? "",
    saleType: (line.saleType as LeadSaleType) ?? "",
    planId: line.planId ?? "",
    equipment: line.equipment ?? "",
    equipmentMode: line.equipmentMode === "with" ? "with" : "none",
    currentOperator: (line.currentOperator as CurrentOperator) ?? "",
    deliveryType: (line.deliveryType as DeliveryType) ?? "",
    email: line.email ?? "",
    deliveryAddress: line.deliveryAddress ?? "",
    region: line.region ?? "",
    comuna: line.comuna ?? "",
    equipmentCatalogId: line.equipmentCatalogId ?? "",
    equipmentModel: line.equipmentModel ?? "",
    equipmentValue: line.equipmentValue ?? "",
    equipmentDownPayment: line.equipmentDownPayment ?? "",
    equipmentInstallments: line.equipmentInstallments ?? "",
    equipmentInstallmentValue: line.equipmentInstallmentValue ?? "",
    equipmentCommercialText: line.equipmentCommercialText ?? "",
    accountType: line.accountType === "prepaid" ? "prepaid" : "postpaid",
    isUpselling: Boolean(line.isUpselling),
  }));
}

export function draftToFormValues(input: {
  conversation: { customerName: string; rut: string; phone: string };
  draft?: {
    gestionId: string;
    customerName: string;
    rut: string;
    type: string;
    notes: string;
    lines: SaveLeadInput["lines"];
  } | null;
}): LeadFormValues {
  const { observations, internalNotes } = splitGestionNotes(input.draft?.notes ?? "");
  return {
    customerName: input.draft?.customerName || input.conversation.customerName,
    rut: input.draft?.rut || input.conversation.rut,
    phone: input.conversation.phone,
    type: input.draft?.type ?? "venta",
    observations,
    internalNotes,
    followUpDate: "",
    lines: mapStoredLinesToForm(input.draft?.lines),
  };
}

/** Línea lista para persistir en una gestión de venta. */
export function isCompleteSaleLine(line: LeadLineValues): boolean {
  return Boolean(
    line.phone?.trim() &&
      line.saleType &&
      line.planId?.trim() &&
      line.region?.trim() &&
      line.comuna?.trim(),
  );
}

export function mapSaleLineForSave(line: LeadLineValues) {
  const equipmentMode: EquipmentMode | "" = line.equipmentMode === "with" ? "with" : "none";
  const accountType: LineAccountType = line.accountType === "prepaid" ? "prepaid" : "postpaid";
  return {
    phone: line.phone.trim(),
    saleType: line.saleType as LeadSaleType,
    planId: line.planId,
    equipment: line.equipment,
    equipmentMode,
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
    accountType,
    isUpselling: Boolean(line.isUpselling),
  };
}

export function formatSaveLeadApiError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "No se pudo guardar la gestión. Intenta nuevamente.";
  }
  const err = error as { message?: string; details?: unknown; status?: number };
  const base = err.message || "No se pudo guardar la gestión.";

  const issues = err.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | undefined;
  if (!issues) return base;

  const parts: string[] = [];
  if (issues.formErrors?.length) parts.push(...issues.formErrors);
  if (issues.fieldErrors) {
    for (const [field, msgs] of Object.entries(issues.fieldErrors)) {
      if (msgs?.length) parts.push(`${field}: ${msgs.join(", ")}`);
    }
  }
  if (parts.length === 0) return base;
  return `${base} ${parts.slice(0, 3).join(" · ")}`;
}

/** Mapea tipo de venta del formulario Leads al catálogo de Mis Ventas. */
export function mapLeadLineToSaleType(
  saleType: LeadSaleType,
  equipmentMode: EquipmentMode | "",
): SaleType {
  if (saleType === "portability") {
    return equipmentMode === "with" ? "portability_device" : "portability";
  }
  if (saleType === "renewal") {
    return equipmentMode === "with" ? "device_renewal" : "portability";
  }
  if (saleType === "migration") return "migration";
  if (saleType === "new_line") return "new_line";
  return "portability";
}

/** Convierte una gestión de venta guardada en Leads al payload de Mis Ventas. */
export function leadGestionToNewSaleInput(
  input: SaveLeadInput,
  options?: { isSaleFlowType?: boolean },
): NewSaleInput | null {
  const isSaleFlow = options?.isSaleFlowType ?? input.type === "venta";
  if (!isSaleFlow || input.lines.length === 0) return null;
  return {
    customerName: input.customerName,
    rut: input.rut,
    phone: input.phone,
    email: input.lines.find((l) => l.email?.trim())?.email || undefined,
    notes: input.notes || undefined,
    lines: input.lines.map((line) => ({
      phoneNumber: line.phone,
      saleType: mapLeadLineToSaleType(line.saleType, line.equipmentMode ?? "none"),
      deviceName:
        line.equipmentModel?.trim() ||
        line.equipment?.trim() ||
        line.equipmentCommercialText?.trim() ||
        undefined,
    })),
  };
}
