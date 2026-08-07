/** Bloque 10 — VDI Línea Nueva sin equipo ✅ CONGELADO v1.0 */

export const LINEA_NUEVA_BLOQUE10_FROZEN_VERSION = "v1.0" as const;

/** Encabezado raw `[23]` — categoría UI, no se lee al cliente. */
export const LINEA_NUEVA_BLOQUE10_RAW23_HEADING =
  "ACEPTACIÓN FINAL Y PROCESO DE VALIDACIÓN DE IDENTIDAD";

/** Instrucción ramas raw `[23]`/`[61]` — flujo asesora, no se lee al cliente. */
export const LINEA_NUEVA_BLOQUE10_RAW23_BRANCH_INSTRUCTION =
  "SI: Aclarar dudas / No: Seguir con la pregunta de aceptación y proceso de VDI.";

/** Instrucción respuesta raw `[25]`/`[65]` — nota asesora, no se lee al cliente. */
export const LINEA_NUEVA_BLOQUE10_RAW25_CLIENT_RESPONSE_INSTRUCTION =
  "RESPUESTA CLIENTE : SI , en caso contrario gatilla la respuesta consultando si su respuesta se considera un SI.";
