/**
 * Bloque 13 — Despedida
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [33]
 * Builder: buildBlock12FarewellSpeech (transversal Portabilidad v1.0)
 */

import { buildBlock12FarewellSpeech } from "@/lib/sales-script/teleprompter/block12-farewell-speech";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import {
  assertLineaNuevaBloque13Ready,
  lineaNuevaDespedidaExecutiveEmail,
  lineaNuevaDespedidaExecutiveName,
} from "./bloque-13-despedida.validation";

export function buildLineaNuevaBloque13Despedida(ctx: LineaNuevaScriptContext): {
  content: string;
} {
  const readyCtx = assertLineaNuevaBloque13Ready(ctx);

  return {
    content: buildBlock12FarewellSpeech({
      executiveEmail: lineaNuevaDespedidaExecutiveEmail(readyCtx),
      executiveName: lineaNuevaDespedidaExecutiveName(readyCtx),
    }),
  };
}

/** Bloque 13 — Despedida ✅ CONGELADO v1.0 */
export const lineaNuevaBloque13Despedida: LineaNuevaSectionModule = {
  id: "despedida",
  label: "Despedida",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque13Despedida(ctx);
    builder.section("despedida", "Despedida");
    builder.addStep(step);
    builder.endSection();
  },
};
