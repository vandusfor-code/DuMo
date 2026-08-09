/**
 * Catálogo maestro de equipos — validación para teleprónter y gestión.
 * Única fuente de verdad: equipment.repository / pantalla Admin Equipos.
 */

import type { EquipmentCatalogItem, UpsertEquipmentInput } from "@/types/equipment";
import type { SaveLeadInput } from "@/types/lead";

/** Compatibilidad: catálogos antiguos sin isPieCero usaban downPayment === 0. */
export function resolveEquipmentIsPieCero(
  item: Pick<EquipmentCatalogItem, "isPieCero" | "downPayment">,
): boolean {
  if (typeof item.isPieCero === "boolean") return item.isPieCero;
  return Number(item.downPayment) === 0;
}

function lineLabel(index: number, isMain: boolean): string {
  if (isMain) return "la línea principal";
  return `la línea adicional ${index + 1}`;
}

function expectedEquipmentModel(item: EquipmentCatalogItem): string {
  return `${item.brand} ${item.model}`.trim();
}

function snapshotFieldMismatch(
  label: string,
  fieldLabel: string,
  expected: string,
  actual: string,
): string {
  return `Los datos del equipo en ${label} no coinciden con el catálogo maestro (${fieldLabel}). Vuelve a seleccionar el equipo en la gestión antes de generar el teleprónter. Esperado: "${expected}". Guardado: "${actual}".`;
}

/** Valida una línea con equipo contra el catálogo maestro. */
export function validateLineEquipmentForTeleprompter(
  line: SaveLeadInput["lines"][number],
  lineIndex: number,
  catalogById: Map<string, EquipmentCatalogItem>,
): string | null {
  if (line.equipmentMode !== "with") return null;

  const label = lineLabel(lineIndex, lineIndex === 0);
  const equipmentId = line.equipmentCatalogId?.trim() ?? "";

  if (!equipmentId) {
    return `En ${label} falta seleccionar un equipo del catálogo. Completa la gestión antes de generar el teleprónter de Portabilidad con Equipo.`;
  }

  const item = catalogById.get(equipmentId);
  if (!item) {
    return `El equipo "${equipmentId}" de ${label} no existe en el catálogo maestro. Verifica la configuración en Admin → Equipos o vuelve a seleccionar el equipo.`;
  }

  if (item.status !== "active") {
    return `El equipo "${item.commercialName}" (${item.id}) de ${label} está inactivo. Actívalo en Admin → Equipos o selecciona otro equipo.`;
  }

  const commercialName = line.equipment?.trim() ?? "";
  if (!commercialName) {
    return `En ${label} no hay nombre comercial del equipo guardado. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (commercialName !== item.commercialName) {
    return snapshotFieldMismatch(label, "nombre comercial", item.commercialName, commercialName);
  }

  const modelSnapshot = line.equipmentModel?.trim() ?? "";
  const expectedModel = expectedEquipmentModel(item);
  if (!modelSnapshot) {
    return `En ${label} no hay marca/modelo del equipo guardado. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (modelSnapshot !== expectedModel) {
    return snapshotFieldMismatch(label, "marca y modelo", expectedModel, modelSnapshot);
  }

  const totalValue = Number(line.equipmentValue);
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    return `En ${label} falta el valor total del equipo. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (totalValue !== item.totalValue) {
    return snapshotFieldMismatch(
      label,
      "valor total",
      String(item.totalValue),
      String(totalValue),
    );
  }

  const downPayment = Number(line.equipmentDownPayment);
  if (!Number.isFinite(downPayment) || downPayment < 0) {
    return `En ${label} falta el pie del equipo. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (downPayment !== item.downPayment) {
    return snapshotFieldMismatch(
      label,
      "pie",
      String(item.downPayment),
      String(downPayment),
    );
  }

  const installments = Number(line.equipmentInstallments);
  if (!Number.isFinite(installments) || installments <= 0) {
    return `En ${label} falta la cantidad de cuotas del equipo. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (installments !== item.installmentsCount) {
    return snapshotFieldMismatch(
      label,
      "cantidad de cuotas",
      String(item.installmentsCount),
      String(installments),
    );
  }

  const installmentValue = Number(line.equipmentInstallmentValue);
  if (!Number.isFinite(installmentValue) || installmentValue <= 0) {
    return `En ${label} falta el valor de cuota del equipo. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (installmentValue !== item.installmentValue) {
    return snapshotFieldMismatch(
      label,
      "valor cuota",
      String(item.installmentValue),
      String(installmentValue),
    );
  }

  const commercialText = line.equipmentCommercialText?.trim() ?? "";
  if (!commercialText) {
    return `En ${label} falta el texto comercial del equipo. Vuelve a seleccionar el equipo en la gestión.`;
  }
  if (commercialText !== item.commercialText) {
    return snapshotFieldMismatch(
      label,
      "texto comercial",
      item.commercialText,
      commercialText,
    );
  }

  return null;
}

/** Valida campos obligatorios al crear o editar un equipo en el catálogo maestro. */
export function validateEquipmentCatalogInput(
  input: UpsertEquipmentInput & { isPieCero?: boolean },
): string | null {
  if (!input.commercialName?.trim()) {
    return "El nombre comercial es obligatorio.";
  }
  if (!input.brand?.trim()) {
    return "La marca es obligatoria.";
  }
  if (!input.model?.trim()) {
    return "El modelo es obligatorio.";
  }

  const totalValue = Number(input.totalValue);
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    return "El valor total debe ser un número mayor a 0.";
  }

  const downPayment = Number(input.downPayment);
  if (!Number.isFinite(downPayment) || downPayment < 0) {
    return "El valor del pie debe ser un número igual o mayor a 0.";
  }

  const installmentsCount = Number(input.installmentsCount);
  if (!Number.isInteger(installmentsCount) || installmentsCount <= 0) {
    return "La cantidad de cuotas debe ser un número entero mayor a 0.";
  }

  const installmentValue = Number(input.installmentValue);
  if (!Number.isFinite(installmentValue) || installmentValue <= 0) {
    return "El valor de cada cuota debe ser un número mayor a 0.";
  }

  if (input.status !== "active" && input.status !== "inactive") {
    return 'El estado debe ser "Activo" o "Inactivo".';
  }

  if (input.isPieCero !== undefined && typeof input.isPieCero !== "boolean") {
    return "Indica si el equipo tiene beneficio Pie Cero (Sí o No).";
  }

  return null;
}

/** Valida todas las líneas con equipo de una gestión contra el catálogo maestro. */
export function validateGestionEquipment(
  gestion: SaveLeadInput,
  equipmentCatalog: EquipmentCatalogItem[],
): string | null {
  const hasEquipmentLine = gestion.lines.some((l) => l.equipmentMode === "with");
  if (!hasEquipmentLine) return null;

  if (equipmentCatalog.length === 0) {
    return "No hay equipos configurados en el catálogo maestro. Contacta al administrador para cargar equipos en Admin → Equipos.";
  }

  const catalogById = new Map(equipmentCatalog.map((item) => [item.id, item]));

  for (let i = 0; i < gestion.lines.length; i++) {
    const error = validateLineEquipmentForTeleprompter(gestion.lines[i], i, catalogById);
    if (error) return error;
  }

  return null;
}
