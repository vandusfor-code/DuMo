/**
 * Bloque 9 — Aceptación final + VDI.
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 60–65).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block9AcceptanceSpeechInput = {
  clientFirstName: string;
};

const CONDICIONES_DUDAS_ADVISOR_NOTE =
  "El cliente manifestó tener dudas con las condiciones entregadas. Resuelve sus inquietudes y, cuando finalices, continúa con la pregunta de aceptación y el proceso de validación de identidad.";

const VDI_QUESTION =
  "Entiendes y en conjunto con iniciar ahora el proceso de Validación de identidad aceptas las condiciones de este contrato, ¿Lo aceptas?";

const VDI_NO_ADVISOR_NOTE =
  "El cliente no aceptó de forma explícita. Consulta si su respuesta se considera un SÍ para continuar con la validación de identidad.";

export function buildBlock9AcceptanceSpeech(input: Block9AcceptanceSpeechInput): {
  content: string;
  branch: SalesScriptBranch;
} {
  return {
    content: `${input.clientFirstName}, ¿te queda alguna duda con las condiciones entregadas?`,
    branch: {
      condicionesDudas: {
        advisorNoteOnYes: CONDICIONES_DUDAS_ADVISOR_NOTE,
      },
      acceptance: {
        postCondicionesSpeech: VDI_QUESTION,
        advisorNoteOnNo: VDI_NO_ADVISOR_NOTE,
      },
    },
  };
}
