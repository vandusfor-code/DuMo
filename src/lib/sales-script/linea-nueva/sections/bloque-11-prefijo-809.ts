/**
 * Bloque 11 — Prefijo 809
 * ✅ CONGELADO v1.0 — AUDITORÍA DOCUMENTAL APROBADA — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [26]–[31]
 * Builder: buildBlock10Prefijo809Speech (transversal Portabilidad v1.0)
 * Adaptación LN: solo override advisorNoteOnBlockStart (raw `[26]` segmento LN)
 */

import { buildBlock10Prefijo809Speech } from "@/lib/sales-script/teleprompter/block10-prefijo809-speech";
import type { SalesScriptBranch } from "@/types/sales-script";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import { LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE } from "./bloque-11-prefijo-809.constants";
import {
  assertLineaNuevaBloque11Ready,
  lineaNuevaPrefijo809ClientFirstName,
} from "./bloque-11-prefijo-809.validation";

export function buildLineaNuevaBloque11Prefijo809(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque11Ready(ctx);
  const step = buildBlock10Prefijo809Speech({
    clientFirstName: lineaNuevaPrefijo809ClientFirstName(readyCtx),
  });

  const prefijo809 = step.branch.prefijo809;
  if (!prefijo809) {
    throw new Error("buildBlock10Prefijo809Speech no retornó rama prefijo809");
  }

  return {
    content: step.content,
    branch: {
      ...step.branch,
      prefijo809: {
        ...prefijo809,
        advisorNoteOnBlockStart: LINEA_NUEVA_BLOQUE11_RAW26_ADVISOR_NOTE,
      },
    },
  };
}

/** Bloque 11 — Prefijo 809 ✅ CONGELADO v1.0 */
export const lineaNuevaBloque11Prefijo809: LineaNuevaSectionModule = {
  id: "prefijo_809",
  label: "Prefijo 809",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque11Prefijo809(ctx);
    builder.section("prefijo_809", "Prefijo 809");
    builder.addStep(step);
    builder.endSection();
  },
};
