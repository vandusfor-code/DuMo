/**
 * Bloque 4 — Beneficios del plan
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [9]–[12]
 * Builder: buildMultilineBenefitsSpeech → buildBlock4BenefitsSpeech (transversal Portabilidad v1.0)
 * Catálogo: CommercialPlan.offer — sin textos fijos del RAW
 */

import { buildMultilineBenefitsSpeech } from "@/lib/sales-script/teleprompter/speech-builders";
import { buildScriptBuildContextFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import { assertLineaNuevaBloque04Ready } from "./bloque-04-beneficios.validation";

export function buildLineaNuevaBloque04Beneficios(ctx: LineaNuevaScriptContext): {
  content: string;
} {
  const readyCtx = assertLineaNuevaBloque04Ready(ctx);
  const scriptCtx = buildScriptBuildContextFromLineaNueva(readyCtx);
  const clientName = scriptCtx.vars.nombre_cliente?.trim() || readyCtx.cliente.nombre.trim();

  return {
    content: buildMultilineBenefitsSpeech(clientName, scriptCtx.lineDetails),
  };
}

/** Bloque 4 — Beneficios del plan ✅ CONGELADO v1.0 */
export const lineaNuevaBloque04Beneficios: LineaNuevaSectionModule = {
  id: "beneficios",
  label: "Plan",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque04Beneficios(ctx);
    builder.section("beneficios", "Plan");
    builder.addStep(step);
    builder.endSection();
  },
};
