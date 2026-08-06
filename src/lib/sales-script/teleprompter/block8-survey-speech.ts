/**
 * Bloque 8 — Encuesta NPS (dos fases).
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 56–57).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block8SurveySpeechInput = {
  clientFirstName: string;
};

const NPS_POST_QUESTION_SPEECH =
  'Que bueno que te gusto y en base a eso, te quiero invitar a que puedas responder una encuesta de satisfacción en base a la atención que te ofrecí como ejecutivo, esta encuesta la vas a recibir en tu correo electrónico una vez que recibas tu producto. La encuesta tiene una escala de evaluación del 0 al 10 dónde 0 es la nota mínima y 10 es la nota máxima y la primera pregunta de la encuesta que es "Pensando únicamente en la experiencia de tu compra, qué tan probable es que recomiendes WOM a un familiar o un amigo?, en esa pregunta me evalúas a mi y mi atención, de antemano muchas gracias por responder.';

const NPS_ADVISOR_NOTE =
  "Recuerda que no puedes fomentar una nota. Continúa con el discurso de la encuesta solo si el cliente respondió favorablemente.";

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
