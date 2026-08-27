/** Slug de la tipificación que activa el flujo comercial de venta. */
export const SALE_FLOW_TIPIFICATION_SLUG = "venta";

/**
 * Slug de la tipificación neutral con la que arranca toda conversación
 * nueva, hasta que alguien la tipifique manualmente. Antes el formulario
 * caía por defecto en "venta" (bug: toda conversación sin tipificar se veía
 * como venta ya cerrada, tanto en el selector como en el badge de la lista).
 */
export const NEW_LEAD_TIPIFICATION_SLUG = "nuevo_lead";

/** Tipificaciones del sistema — no editables ni eliminables por admin. */
export const PROTECTED_TIPIFICATION_SLUGS = [
  SALE_FLOW_TIPIFICATION_SLUG,
  NEW_LEAD_TIPIFICATION_SLUG,
] as const;

export function isProtectedTipificationSlug(slug: string): boolean {
  return (PROTECTED_TIPIFICATION_SLUGS as readonly string[]).includes(slug);
}

export function protectedTipificationError(slug: string): string {
  if (slug === SALE_FLOW_TIPIFICATION_SLUG) {
    return 'La tipificación "Venta" es del sistema y no puede modificarse ni eliminarse.';
  }
  if (slug === NEW_LEAD_TIPIFICATION_SLUG) {
    return 'La tipificación "Nuevo lead" es del sistema y no puede modificarse ni eliminarse.';
  }
  return "Esta tipificación es del sistema y no puede modificarse ni eliminarse.";
}

export function assertTipificationEditable(slug: string): void {
  if (isProtectedTipificationSlug(slug)) {
    throw new Error(protectedTipificationError(slug));
  }
}
