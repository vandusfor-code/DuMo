/**
 * Bloque 5 — Condiciones generales
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [13]
 * Builder: buildGeneralConditionsSpeech (transversal Portabilidad v1.0 — exportado)
 */

import { buildGeneralConditionsSpeech } from "@/lib/sales-script/teleprompter/block5-delivery-speech";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";

export function buildLineaNuevaBloque05Condiciones(): { content: string } {
  return {
    content: buildGeneralConditionsSpeech(),
  };
}

/** Bloque 5 — Condiciones generales ✅ CONGELADO v1.0 */
export const lineaNuevaBloque05Condiciones: LineaNuevaSectionModule = {
  id: "condiciones",
  label: "Condiciones",
  register({ builder }) {
    const step = buildLineaNuevaBloque05Condiciones();
    builder.section("condiciones", "Condiciones");
    builder.addStep(step);
    builder.endSection();
  },
};
