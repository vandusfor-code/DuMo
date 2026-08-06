import type { LeadLineValues } from "@/types/lead-form";
import type { EquipmentMode, LeadSaleType } from "@/types/lead";

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
