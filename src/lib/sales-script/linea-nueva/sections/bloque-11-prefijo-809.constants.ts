/** Bloque 11 — Prefijo 809 Línea Nueva sin equipo ✅ CONGELADO v1.0 */

export const LINEA_NUEVA_BLOQUE11_FROZEN_VERSION = "v1.0" as const;

/** Encabezado raw `[26]` — categoría UI, no se lee al cliente. */
export const LINEA_NUEVA_BLOQUE11_RAW26_HEADING = "DESHABILITACIÓN PREFIJO 809";

/**
 * Nota asesora LN — segmento literal raw `[26]` (instrucción línea nueva).
 * Sobrescribe `advisorNoteOnBlockStart` del builder transversal en orquestador LN.
 */
export const LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE =
  "Recuerda que si la contratación del cliente es por línea nueva, debes tomar el nuevo número desde la orden de ZS una vez que generes el folio de MAT y derivar por formulario.";

/** Segmento raw `[26]` portabilidad — no aplica en LN; excluido de advisorNoteOnBlockStart. */
export const LINEA_NUEVA_BLOQUE11_RAW26_PORTABILITY_NOTE =
  "Si la contratación es por portabilidad, podrás ingresar el número a portar directo al formulario.";

/** Regla raw `[26]`/`[69]` — nota asesora, no discurso cliente. */
export const LINEA_NUEVA_BLOQUE11_RAW26_EXPLICIT_YES_RULE =
  "Se debe tener el SÍ explícito del cliente.";
