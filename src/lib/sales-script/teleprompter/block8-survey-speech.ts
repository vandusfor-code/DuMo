/**
 * Bloque 8 — Encuesta NPS (dos fases).
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 56–57) + cierre oficial.
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block8SurveySpeechInput = {
  clientFirstName: string;
  executiveEmail: string;
  executiveName: string;
};

const NPS_ADVISOR_NOTE =
  "No fomentes una calificación. Continúa con la invitación únicamente si el cliente respondió favorablemente.";

export function buildBlock8SurveySpeech(input: Block8SurveySpeechInput): {
  content: string;
  branch: SalesScriptBranch;
} {
  const postQuestionSpeech = [
    "Que bueno que te gusto y en base a eso, te quiero invitar a que puedas responder una encuesta de satisfacción en base a la atención que te ofrecí como ejecutivo, esta encuesta la vas a recibir en tu correo electrónico una vez que recibas tu producto.",
    "",
    "La encuesta tiene una escala de evaluación del 0 al 10 dónde 0 es la nota mínima y 10 es la nota máxima y la primera pregunta de la encuesta que es:",
    "",
    '"Pensando únicamente en la experiencia de tu compra, ¿qué tan probable es que recomiendes WOM a un familiar o un amigo?"',
    "",
    "En esa pregunta me evalúas a mí y mi atención, de antemano muchas gracias por responder.",
    "",
    `Te invito a tomar nota de mi correo electrónico el cual es ${input.executiveEmail}, quedando a tu disposición para cualquier consulta adicional que tengas y para el seguimiento de tu venta.`,
    "",
    `Te recuerdo que fuiste atendido por ${input.executiveName}.`,
    "",
    "Bienvenido a WOM, que tengas un excelente día.",
  ].join("\n");

  return {
    content: `${input.clientFirstName}, ¿Qué te pareció mi atención?`,
    branch: {
      npsSurvey: {
        postQuestionSpeech,
        advisorNoteBeforeContinue: NPS_ADVISOR_NOTE,
      },
    },
  };
}
