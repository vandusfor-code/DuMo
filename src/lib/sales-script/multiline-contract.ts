import { formatCurrency } from "@/lib/format";
import type { LineSpeechDetail } from "@/lib/sales-script/teleprompter/speech-builders";

/** Texto de contratación multilínea listo para leer en voz alta. */
export function buildMultilineContractSpeech(input: {
  lineCount: number;
  planName: string;
  mainValue: number;
  additionalLineValue: number;
  totalMonthly: number;
}): string {
  const { lineCount, planName, mainValue, additionalLineValue, totalMonthly } = input;
  const main = formatCurrency(mainValue);
  const add = formatCurrency(additionalLineValue);
  const total = formatCurrency(totalMonthly);
  const additional = lineCount - 1;

  if (lineCount <= 1) {
    return `Contratarás el ${planName} por un valor mensual de ${main}.`;
  }

  if (lineCount === 2) {
    return [
      `Tu línea principal quedará con el ${planName} por un valor mensual de ${main}.`,
      `Adicionalmente contratarás 1 línea adicional con un valor mensual de ${add}.`,
      `El total mensual de tu contratación será de ${total}.`,
    ].join("\n\n");
  }

  if (lineCount === 3) {
    return [
      `Tu línea principal quedará con el ${planName} por un valor mensual de ${main}.`,
      `Además contratarás 2 líneas adicionales por ${add} cada una.`,
      `El valor mensual total será de ${total}.`,
    ].join("\n\n");
  }

  return [
    `Tu línea principal quedará con el ${planName} por un valor mensual de ${main}.`,
    `Además contratarás ${additional} líneas adicionales por ${add} cada una.`,
    `El valor mensual total será de ${total}.`,
  ].join("\n\n");
}

/** Multilínea con planes o valores distintos por línea (doc línea 12-13). */
export function buildHeterogeneousMultilineSpeech(
  lineDetails: LineSpeechDetail[],
  totalMonthly: number,
): string {
  const parts = lineDetails.map((line) => {
    const role = line.isMain
      ? "Tu línea principal"
      : `Tu línea adicional ${line.index}`;
    return `${role} ${line.phone} quedará con el ${line.planName} por un valor mensual de ${line.planValueLabel}.`;
  });
  parts.push(`El total mensual de tu contratación será de ${formatCurrency(totalMonthly)}.`);
  return parts.join("\n\n");
}
