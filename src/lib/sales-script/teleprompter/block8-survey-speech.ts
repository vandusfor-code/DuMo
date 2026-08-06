/**
 * Bloque 8 — Invitación a encuesta por correo.
 * La encuesta no se realiza en la llamada: solo se pregunta por la atención
 * y, si la respuesta fue favorable, se informa que llegará por correo.
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block8SurveySpeechInput = {
  clientFirstName: string;
};

const NPS_POST_QUESTION_SPEECH =
  "Recibirás una encuesta de satisfacción en tu correo electrónico una vez recibas tu producto.";

const NPS_ADVISOR_NOTE =
  "No fomentes una calificación. Continúa con la invitación únicamente si el cliente respondió favorablemente.";

export function buildBlock8SurveySpeech(input: Block8SurveySpeechInput): {
  content: string;
  branch: SalesScriptBranch;
} {
  return {
    content: `${input.clientFirstName}, ¿Qué te pareció mi atención?`,
    branch: {
      npsSurvey: {
        postQuestionSpeech: NPS_POST_QUESTION_SPEECH,
        advisorNoteBeforeContinue: NPS_ADVISOR_NOTE,
      },
    },
  };
}
