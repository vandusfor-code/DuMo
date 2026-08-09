/** Slug de la tipificación que activa el flujo comercial de venta. */
export const SALE_FLOW_TIPIFICATION_SLUG = "venta";

/** Tipificaciones del sistema — no editables ni eliminables por admin. */
export const PROTECTED_TIPIFICATION_SLUGS = [SALE_FLOW_TIPIFICATION_SLUG] as const;

export function isProtectedTipificationSlug(slug: string): boolean {
  return (PROTECTED_TIPIFICATION_SLUGS as readonly string[]).includes(slug);
}

export function protectedTipificationError(slug: string): string {
  if (slug === SALE_FLOW_TIPIFICATION_SLUG) {
    return 'La tipificación "Venta" es del sistema y no puede modificarse ni eliminarse.';
  }
  return "Esta tipificación es del sistema y no puede modificarse ni eliminarse.";
}

export function assertTipificationEditable(slug: string): void {
  if (isProtectedTipificationSlug(slug)) {
    throw new Error(protectedTipificationError(slug));
  }
}
