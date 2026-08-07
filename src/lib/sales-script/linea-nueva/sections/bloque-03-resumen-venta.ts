/**
 * Bloque 3 — Resumen de contratación
 * ✅ CONGELADO v1.0 — Línea Nueva sin equipo
 *
 * Fuente: linea-nueva-sin-equipo.raw.txt [4]–[8]
 * Builders: buildContractDataValidationIntro + buildContractSummarySpeech(mode: new_line)
 */

import {
  buildContractDataValidationIntro,
  buildContractSummarySpeech,
} from "@/lib/sales-script/contract-resumen";
import type { SalesScriptBranch } from "@/types/sales-script";
import { buildScriptBuildContextFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";
import type { LineaNuevaSectionModule } from "../linea-nueva-types";
import {
  LINEA_NUEVA_BLOQUE03_DATA_VALIDATION_ADVISOR_NOTE_ON_NO,
} from "./bloque-03-resumen-venta.constants";
import { assertLineaNuevaBloque03Ready } from "./bloque-03-resumen-venta.validation";

export function buildLineaNuevaBloque03ResumenVenta(ctx: LineaNuevaScriptContext): {
  content: string;
  branch: SalesScriptBranch;
} {
  const readyCtx = assertLineaNuevaBloque03Ready(ctx);
  const scriptCtx = buildScriptBuildContextFromLineaNueva(readyCtx);

  return {
    content: buildContractDataValidationIntro(scriptCtx),
    branch: {
      dataValidation: {
        postValidationSpeech: buildContractSummarySpeech(scriptCtx, "new_line"),
        advisorNoteOnNo: LINEA_NUEVA_BLOQUE03_DATA_VALIDATION_ADVISOR_NOTE_ON_NO,
      },
    },
  };
}

/** Bloque 3 — Resumen de contratación ✅ CONGELADO v1.0 */
export const lineaNuevaBloque03ResumenVenta: LineaNuevaSectionModule = {
  id: "resumen_venta",
  label: "Contratación",
  register({ ctx, builder }) {
    const step = buildLineaNuevaBloque03ResumenVenta(ctx);
    builder.section("resumen_venta", "Contratación");
    builder.addStep(step);
    builder.endSection();
  },
};
