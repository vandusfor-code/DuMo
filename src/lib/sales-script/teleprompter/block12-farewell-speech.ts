/**
 * Bloque 12 — Despedida.
 * Fuente: portabilidad-sin-equipo.raw.txt (líneas 78–81).
 */

export type Block12FarewellSpeechInput = {
  executiveEmail: string;
  executiveName: string;
};

export function buildBlock12FarewellSpeech(input: Block12FarewellSpeechInput): string {
  return [
    `Te invito a tomar nota de mi correo electrónico el cual es ${input.executiveEmail} quedando a tu disposición para cualquier consulta adicional que tengas y para el seguimiento de tu venta.`,
    "",
    `Te recuerdo que fuiste atendido por ${input.executiveName}.`,
    "",
    "Bienvenido a WOM, que tengas un excelente día!",
  ].join("\n");
}
