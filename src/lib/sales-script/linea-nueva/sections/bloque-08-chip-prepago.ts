/**
 * Bloque 8 — Chip prepago de regalo
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [21]
 * Builder: buildBlock7GiftSpeech (transversal Portabilidad v1.0)
 */

import { buildBlock7GiftSpeech } from "@/lib/sales-script/teleprompter/block7-gift-speech";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import {
  assertLineaNuevaBloque08Ready,
  lineaNuevaClientFirstName,
} from "./bloque-08-chip-prepago.validation";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export function buildLineaNuevaBloque08ChipPrepago(ctx: LineaNuevaScriptContext): {
  content: string;
} {
  const readyCtx = assertLineaNuevaBloque08Ready(ctx);

  return {
    content: buildBlock7GiftSpeech({
      clientFirstName: lineaNuevaClientFirstName(readyCtx),
    }),
  };
}

/** Bloque 8 — Chip prepago ✅ CONGELADO v1.0 */
export const lineaNuevaBloque08ChipPrepago: LineaNuevaSectionModule = {
  id: "chip_prepago",
  label: "Chip prepago",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque08ChipPrepago(ctx);
    builder.section("chip_prepago", "Chip prepago");
    builder.addStep(step);
    builder.endSection();
  },
};
