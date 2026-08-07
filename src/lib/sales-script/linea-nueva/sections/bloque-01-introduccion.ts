/**
 * Bloque 1 — Introducción / Inicio
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: SPEC-teleprompter-linea-nueva-sin-equipo.md §4
 * Discurso: buildBlock1SaludoSpeech (transversal Portabilidad v1.0)
 * Nota asesora: linea-nueva-sin-equipo.raw.txt [1]
 */

import { buildBlock1SaludoSpeech } from "@/lib/sales-script/teleprompter/block1-saludo-speech";
import type { SalesScriptBranch } from "@/types/sales-script";
import { minimalScriptBuildContextForSaludo } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import { LINEA_NUEVA_BLOQUE01_ADVISOR_NOTE } from "./bloque-01-introduccion.constants";

export function buildLineaNuevaBloque01Introduccion(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const scriptCtx = minimalScriptBuildContextForSaludo(ctx);

  return {
    content: buildBlock1SaludoSpeech(scriptCtx),
    branch: {
      inicio: {
        advisorNoteOnBlockStart: LINEA_NUEVA_BLOQUE01_ADVISOR_NOTE,
      },
    },
  };
}

/** Bloque 1 — Introducción / Inicio ✅ CONGELADO v1.0 */
export const lineaNuevaBloque01Introduccion: LineaNuevaSectionModule = {
  id: "introduccion",
  label: "Inicio",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque01Introduccion(ctx);
    builder.section("introduccion", "Inicio");
    builder.addStep(step);
    builder.endSection();
  },
};
