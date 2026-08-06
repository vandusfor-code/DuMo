/**
 * Bloque 10 — Prefijo 809.
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 67–74).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block10Prefijo809SpeechInput = {
  clientFirstName: string;
};

const ADVISOR_NOTE_BLOCK_START =
  "Si la contratación es por portabilidad, podrás ingresar el número a portar directo al formulario de deshabilitación del prefijo 809.";

const QUESTION =
  "en base a la normativa vigente de la subsecretaría de telecomunicaciones ¿Te gustaría dejar de recibir llamadas Spam o no deseadas?";

const YES_SPEECH =
  "Perfecto, con esto procederemos a deshabilitar gratis el prefijo 809 para que dejes de recibir llamadas sin tu consentimiento. Haremos la deshabilitación una vez que tu línea esté activa con nosotros.";

const NO_SPEECH =
  "Al deshabilitar el prefijo 809 evitarás recibir llamadas molestas que tu no solicitaste, es una buena opción para controlar tus registros de llamadas, ¿Te interesa deshabilitarlo?";

const FOLLOW_UP_PROMPT = "";

const FOLLOW_UP_NO_SPEECH =
  "Entiendo, de igual forma si más adelante lo deseas hacer, lo puedes autogestionar por la APP WOM.";

const CONSULTA_SPEECH =
  "Existe una norma por la subsecretaría de telecomunicaciones que te permite a ti como usuario, poder controlar las llamadas que recibes bajo el prefijo 809, que son llamadas masivas que tu no has solicitado, al deshabilitar este prefijo, evitas las llamadas molestas que tu no deseas recibir.";

const ADVISOR_NOTE_ON_ACCEPT =
  "Si el cliente acepta, debes derivar la solicitud de deshabilitación vía formulario.";

export function buildBlock10Prefijo809Speech(input: Block10Prefijo809SpeechInput): {
  content: string;
  branch: SalesScriptBranch;
} {
  return {
    content: `${input.clientFirstName}, ${QUESTION}`,
    branch: {
      prefijo809: {
        advisorNoteOnBlockStart: ADVISOR_NOTE_BLOCK_START,
        yesSpeech: YES_SPEECH,
        noSpeech: NO_SPEECH,
        followUpPrompt: FOLLOW_UP_PROMPT,
        followUpYesSpeech: YES_SPEECH,
        followUpNoSpeech: FOLLOW_UP_NO_SPEECH,
        consultaSpeech: CONSULTA_SPEECH,
        advisorNoteOnYes: ADVISOR_NOTE_ON_ACCEPT,
      },
    },
  };
}
