import type { SaveLeadInput } from "@/types/lead";
import { LEAD_SALE_TYPE_LABELS } from "@/types/lead";

function mainLineEquipmentMode(line: SaveLeadInput["lines"][number]): "none" | "with" {
  return line.equipmentMode === "with" ? "with" : "none";
}

/** Motivo legible cuando no aplica generar script automático. Null = elegible. */
export function getScriptUnavailableReason(gestion: SaveLeadInput): string | null {
  if (gestion.type !== "venta" || gestion.lines.length === 0) {
    return "El script solo se genera al guardar una gestión de venta con al menos una línea completa.";
  }

  const main = gestion.lines[0];
  if (mainLineEquipmentMode(main) === "with") {
    return "Por ahora el script automático solo está disponible para Portabilidad sin equipo. Selecciona «Sin equipo» en la línea principal.";
  }

  if (main.saleType !== "portability") {
    const label = LEAD_SALE_TYPE_LABELS[main.saleType] ?? main.saleType;
    return `El script automático solo está disponible para Portabilidad sin equipo. Tipo de venta seleccionado: ${label}.`;
  }

  return null;
}

export function isScriptEligible(gestion: SaveLeadInput): boolean {
  return getScriptUnavailableReason(gestion) === null;
}
