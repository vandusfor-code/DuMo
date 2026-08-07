/**
 * Bloque 9 — Encuesta NPS
 * ✅ CONGELADO v1.0 — AUDITORÍA DOCUMENTAL APROBADA — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [22]
 * Builder: buildBlock8SurveySpeech (transversal Portabilidad v1.0)
 */

import { buildBlock8SurveySpeech } from "@/lib/sales-script/teleprompter/block8-survey-speech";
import type { SalesScriptBranch } from "@/types/sales-script";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import {
  assertLineaNuevaBloque09Ready,
  lineaNuevaEncuestaClientFirstName,
} from "./bloque-09-encuesta.validation";

export function buildLineaNuevaBloque09Encuesta(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque09Ready(ctx);

  return buildBlock8SurveySpeech({
    clientFirstName: lineaNuevaEncuestaClientFirstName(readyCtx),
  });
}

/** Bloque 9 — Encuesta NPS ✅ CONGELADO v1.0 */
export const lineaNuevaBloque09Encuesta: LineaNuevaSectionModule = {
  id: "encuesta",
  label: "Encuesta",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque09Encuesta(ctx);
    builder.section("encuesta", "Encuesta");
    builder.addStep(step);
    builder.endSection();
  },
};
