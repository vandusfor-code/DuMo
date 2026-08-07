/**
 * Bloque 2 — Audio legal
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [2]–[3]
 * Builder: buildBlock2AudioSpeech (transversal Portabilidad v1.0)
 */

import { buildBlock2AudioSpeech } from "@/lib/sales-script/teleprompter/block2-audio-speech";
import type { Block2AudioSpeech } from "@/lib/sales-script/teleprompter/block2-audio-speech";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";

/** Bloque 2 — Audio ✅ CONGELADO v1.0 */
export function buildLineaNuevaBloque02Audio(): Block2AudioSpeech {
  return buildBlock2AudioSpeech();
}

export const lineaNuevaBloque02Audio: LineaNuevaSectionModule = {
  id: "audio",
  label: "Audio",
  register({ builder }) {
    const step = buildLineaNuevaBloque02Audio();
    builder.section("audio", "Audio");
    builder.addStep(step);
    builder.endSection();
  },
};
