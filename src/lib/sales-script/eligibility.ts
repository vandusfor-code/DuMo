import type { SaveLeadInput } from "@/types/lead";
import { LEAD_SALE_TYPE_LABELS } from "@/types/lead";

function lineEquipmentLabel(index: number): string {
  if (index === 0) return "la línea principal";
  return `la línea adicional ${index + 1}`;
}

/** Motivo legible cuando no aplica generar script automático. Null = elegible. */
export function getScriptUnavailableReason(
  gestion: SaveLeadInput,
  options?: { isSaleFlowType?: boolean },
): string | null {
  const isSaleFlow = options?.isSaleFlowType ?? gestion.type === "venta";
  if (!isSaleFlow || gestion.lines.length === 0) {
    return "El script solo se genera al guardar una gestión de venta con al menos una línea completa.";
  }

  const main = gestion.lines[0];

  if (main.saleType !== "portability") {
    const label = LEAD_SALE_TYPE_LABELS[main.saleType] ?? main.saleType;
    return `El script automático solo está disponible para Portabilidad (sin equipo o con equipo). Tipo de venta seleccionado: ${label}.`;
  }

  for (let i = 0; i < gestion.lines.length; i++) {
    const line = gestion.lines[i];
    if (line.equipmentMode !== "with") continue;
    if (!line.equipmentCatalogId?.trim()) {
      return `La gestión está incompleta: selecciona un equipo del catálogo en ${lineEquipmentLabel(i)} para generar el teleprónter de Portabilidad con Equipo.`;
    }
  }

  return null;
}

export function isScriptEligible(
  gestion: SaveLeadInput,
  options?: { isSaleFlowType?: boolean },
): boolean {
  return getScriptUnavailableReason(gestion, options) === null;
}
