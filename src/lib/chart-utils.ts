import type { ChartPoint } from "@/types/common";

/** Escala Y legible según meta y datos — evita ticks recortados o fuera de escala. */
export function buildChartYTicks(goal: number, series: ChartPoint[], steps = 4): number[] {
  const dataMax = series.reduce((m, p) => Math.max(m, p.value), 0);
  const top = Math.max(goal, dataMax, steps);
  const rawStep = top / steps;
  const step = Math.max(1, Math.ceil(rawStep));
  const ceiling = step * steps;
  return Array.from({ length: steps }, (_, i) => step * (i + 1)).filter((v) => v <= ceiling);
}
