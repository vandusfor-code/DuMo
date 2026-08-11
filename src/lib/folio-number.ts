/** Radicado escrito manualmente por la asesora — solo dígitos, sin espacios. */
export function isValidFolioNumberFormat(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/** Folio inválido/faltante/duplicado en venta u Operación Duo — mensaje seguro para mostrar al usuario. */
export class FolioNumberValidationError extends Error {}
