/**
 * Bloque 7 — Compatibilidad de equipos
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [19]
 * Builder: buildCompatibilidadEquiposSpeech (exportado desde block5-delivery-speech.ts)
 */

import { buildCompatibilidadEquiposSpeech } from "@/lib/sales-script/teleprompter/block5-delivery-speech";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";

export function buildLineaNuevaBloque07Compatibilidad(): { content: string } {
  return {
    content: buildCompatibilidadEquiposSpeech(),
  };
}

/** Bloque 7 — Compatibilidad ✅ CONGELADO v1.0 */
export const lineaNuevaBloque07Compatibilidad: LineaNuevaSectionModule = {
  id: "compatibilidad",
  label: "Compatibilidad",
  register({ builder }) {
    const step = buildLineaNuevaBloque07Compatibilidad();
    builder.section("compatibilidad", "Compatibilidad");
    builder.addStep(step);
    builder.endSection();
  },
};
