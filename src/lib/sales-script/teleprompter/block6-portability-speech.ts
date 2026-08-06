/**
 * Bloque 6 — Proceso de portabilidad ✅ Aprobado v1.0 (congelado).
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 37–53).
 */

import type { SalesScriptBranch } from "@/types/sales-script";

export type Block6PortabilitySpeechInput = {
  /** Primer nombre — solo apertura (l.39) y cierre (l.53). */
  clientFirstName: string;
  /** Etiqueta del operador registrado en la gestión. */
  currentOperatorLabel: string;
  /** Prepago → Postpago desde operador externo (l.46–52). */
  requiresCapCode: boolean;
};

const CAP_QUESTION =
  "Te envié un SMS al número de teléfono prepago a portar con el código CAP que es un código de 4 dígitos, ¿Puedes validar si lo recibiste? Es necesario este código para poder ejecutar la portabilidad.";

const CAP_YES_SPEECH =
  "Ya completamos el código. De todas formas te comento que el mismo tiene una vigencia de 5 días y en caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.";

const CAP_NO_SPEECH =
  "El código tiene una vigencia de 5 días, por lo que te pido estar atento ya que te contactaremos para solicitarte éste dato. En caso que en este plazo no se haya concretado tu portabilidad, volveremos a enviarte un nuevo código CAP vía SMS para continuar con el proceso.";

const PORTABILITY_DUDAS_ADVISOR_NOTE =
  "El cliente manifestó tener dudas sobre el proceso de portabilidad. Resuelve sus inquietudes y, cuando finalices, continúa con el siguiente bloque.";

function buildPortabilityProcessSpeech(input: Block6PortabilitySpeechInput): string {
  const { clientFirstName, currentOperatorLabel } = input;
  const parts = [
    `${clientFirstName}, Te explico un poco como funciona el proceso de portabilidad.`,
    "",
    "La portabilidad se realiza de lunes a sábado, sin incluir domingos ni festivos, se ejecuta en la madrugada con la finalidad de no interrumpir el servicio.",
    "",
    "Cuando recibas tu chip de WOM, NO lo debes colocar en tu celular, ya que como tu número aún no estará portado no tendrás servicio.",
    "",
    `No Botes el chip de ${currentOperatorLabel} hasta tanto tu portabilidad con WOM no esté 100% realizada. Normalmente la portabilidad demora 1 día hábil en ejecutarse desde que recibas el chip de WOM.`,
    "",
    "Cuándo recibas el chip de WOM, espera al dia siguiente, debes quedar sin servicio en tu operador actual, eso significa que ya estás portado a WOM y es en ese momento que debes colocar el nuevo chip de WOM en tu celular y probar todos los servicios, valida que sea tu número portado, que puedas hacer llamadas y navegar por internet. Si no pierdes la señal en tu operador, eso significa que aún no estás portado, te pido que en ese caso me puedas escribir para poder validar que pasó con la portabilidad y poder gestionar una solución en caso de error.",
    "",
    `Recuerda que no debes tener ningún tipo de deuda con ${currentOperatorLabel} es importante que al momento de recibir tu chip WOM estés al día con tus pagos de boletas o presta lucas. Con deuda, no te puedes portar.`,
    "",
    "NÚMERO TEMPORAL (PROVISORIO): Mientras tu número no se porte a WOM activaremos el servicio con un número temporal, que es un número distinto al que estás portando, este número será solo temporal hasta tanto podamos portar tu número real, lo importante de esto es que mientras tu número no se porte no perderás el servicio con tu operador, por eso es importante que no cambies el chip hasta que estés portado.",
    "",
    "Tu primera boleta de cobro será emitida por un proporcional del servicio desde la activación hasta el corte de tu ciclo de facturación, si tu número no se porta igual se te cobrará el servicio activo con el número temporal.",
  ];

  if (input.requiresCapCode) {
    parts.push("", CAP_QUESTION);
  }

  parts.push("", `${clientFirstName}, ¿Alguna duda con el proceso de porta?`);

  return parts.join("\n");
}

export function buildBlock6PortabilitySpeech(
  input: Block6PortabilitySpeechInput,
): { content: string; branch: SalesScriptBranch } {
  const branch: SalesScriptBranch = {
    portabilityProcess: {
      advisorNoteOnYes: PORTABILITY_DUDAS_ADVISOR_NOTE,
    },
  };

  if (input.requiresCapCode) {
    branch.cap = {
      yesSpeech: CAP_YES_SPEECH,
      noSpeech: CAP_NO_SPEECH,
    };
  }

  return {
    content: buildPortabilityProcessSpeech(input),
    branch,
  };
}
