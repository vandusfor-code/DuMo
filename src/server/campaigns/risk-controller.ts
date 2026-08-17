import "server-only";

/** Fallos consecutivos que disparan auto-pausa — señal de proveedor caído o datos corruptos. */
export const MAX_CONSECUTIVE_FAILURES = 5;

/** Tasa de opt-out en la ventana reciente que dispara auto-pausa (0.3 = 30%). */
export const MAX_OPT_OUT_RATE = 0.3;

/** Tamaño mínimo de muestra antes de evaluar la tasa de opt-out (evita falsos positivos con pocos datos). */
export const MIN_SAMPLE_FOR_OPT_OUT_RATE = 10;

export interface RiskInput {
  consecutiveFailures: number;
  recentOptOuts: number;
  recentProcessed: number;
  providerConnected: boolean;
}

export interface RiskEvaluation {
  shouldAutoPause: boolean;
  reason: string | null;
}

/**
 * Detecta condiciones ANORMALES internas — no intenta predecir bloqueos de
 * WhatsApp. Fallos consecutivos, proveedor desconectado, o una tasa de
 * opt-out fuera de lo normal son señales de que algo está mal (número
 * caído, plantilla ofensiva, datos corruptos) y hay que parar a revisar.
 */
export function evaluateRisk(input: RiskInput): RiskEvaluation {
  if (!input.providerConnected) {
    return { shouldAutoPause: true, reason: "El proveedor de mensajería no respondió (sesión inválida o desconectado)." };
  }

  if (input.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    return {
      shouldAutoPause: true,
      reason: `${input.consecutiveFailures} envíos consecutivos fallaron. Se detiene para revisar antes de seguir.`,
    };
  }

  if (input.recentProcessed >= MIN_SAMPLE_FOR_OPT_OUT_RATE) {
    const optOutRate = input.recentOptOuts / input.recentProcessed;
    if (optOutRate >= MAX_OPT_OUT_RATE) {
      return {
        shouldAutoPause: true,
        reason: `${Math.round(optOutRate * 100)}% de los últimos contactos pidió baja. Se detiene para revisar el mensaje o la lista.`,
      };
    }
  }

  return { shouldAutoPause: false, reason: null };
}
