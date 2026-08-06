/**
 * Bloque 3 — Contratación (Portabilidad con Equipo) ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-con-equipo.raw.txt (líneas 6–14).
 * No modificar copy salvo cambio del script oficial o hallazgo de auditoría.
 */

import type { ScriptBuildContext } from "@/lib/sales-script/context";
import { buildContractDataValidationIntro } from "@/lib/sales-script/contract-resumen";
import { buildBlock3ContractSummaryConEquipoSpeech } from "@/lib/sales-script/teleprompter/block3-contract-summary-con-equipo-speech";
import type { SalesScriptBranch } from "@/types/sales-script";

export type Block3ContratacionConEquipoSpeech = {
  content: string;
  branch: SalesScriptBranch;
};

/** Bloque 3 — Contratación con equipo. */
export function buildBlock3ContratacionConEquipoSpeech(
  ctx: ScriptBuildContext,
): Block3ContratacionConEquipoSpeech {
  return {
    content: buildContractDataValidationIntro(ctx),
    branch: {
      dataValidation: {
        postValidationSpeech: buildBlock3ContractSummaryConEquipoSpeech(ctx),
        advisorNoteOnNo:
          "El cliente indicó que sus datos no son correctos. Corrige la información en la gestión y, cuando finalices, continúa con el resumen de la contratación.",
      },
    },
  };
}
