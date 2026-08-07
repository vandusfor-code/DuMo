import type { SalesScriptStep } from "@/types/sales-script";
import type { LineaNuevaScriptSection, LineaNuevaScriptOutput } from "./linea-nueva-types";

/**
 * Renderer puro: convierte secciones en salida de teleprompter.
 * No valida, no evalúa reglas, no toma decisiones comerciales.
 */
export function renderLineaNuevaSections(
  sections: LineaNuevaScriptSection[],
  meta: Pick<LineaNuevaScriptOutput, "flowKey" | "flowTitle" | "variant">,
): LineaNuevaScriptOutput {
  const visible = sections.filter((s) => !s.skipped);

  return {
    ...meta,
    sections,
    steps: toSalesScriptSteps(visible),
  };
}

export function toSalesScriptSteps(sections: LineaNuevaScriptSection[]): SalesScriptStep[] {
  return sections.map((section) => ({
    id: section.id,
    sectionLabel: section.label,
    content: section.content,
    branch: section.branch,
  }));
}
