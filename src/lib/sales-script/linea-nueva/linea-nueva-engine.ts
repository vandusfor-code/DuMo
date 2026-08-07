import { LineaNuevaScriptBuilder } from "./linea-nueva-builder";
import {
  buildLineaNuevaScriptContext,
  LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY,
  LINEA_NUEVA_SIN_EQUIPO_FLOW_TITLE,
} from "./linea-nueva-context";
import { renderLineaNuevaSections } from "./linea-nueva-renderer";
import { lineaNuevaRuleEngine } from "./linea-nueva-rules";
import type {
  LineaNuevaEngineInput,
  LineaNuevaScriptContext,
  LineaNuevaScriptOutput,
} from "./linea-nueva-types";
import { registerLineaNuevaSections } from "./sections/registry";
import { validateLineaNuevaContext } from "./validation";

/** Motor congelado — pendiente de documento oficial.
 *
 * TODO (LINEA NUEVA):
 * Pendiente implementación desde el documento oficial
 * "SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx"
 * No generar script hasta realizar la auditoría documental.
 * Ver LINEA_NUEVA_IMPLEMENTATION_SPEC.md
 */
export const LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING = true as const;

export const LINEA_NUEVA_PENDING_MESSAGE =
  "Script Línea Nueva pendiente de documento oficial. Agregue SCRIPT DE CIERRE LÍNEA NUEVA SIN EQUIPO.docx al repositorio antes de implementar textos.";

export class LineaNuevaEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaEngineError";
  }
}

function assertOfficialDocumentAvailable(): void {
  if (LINEA_NUEVA_OFFICIAL_DOCUMENT_PENDING) {
    throw new LineaNuevaEngineError(
      LINEA_NUEVA_PENDING_MESSAGE,
      "OFFICIAL_DOCUMENT_PENDING",
    );
  }
}

/**
 * Motor principal Línea Nueva.
 *
 * Contexto → Validaciones → Reglas → Construcción → Render → Script final
 *
 * ⛔ Congelado: no genera script hasta incorporar el documento oficial.
 */
export function runLineaNuevaScriptEngine(
  ctx: LineaNuevaScriptContext,
): LineaNuevaScriptOutput {
  assertOfficialDocumentAvailable();

  const validation = validateLineaNuevaContext(ctx);
  if (!validation.ok) {
    const first = validation.errors[0];
    throw new LineaNuevaEngineError(
      first?.message ?? "Contexto inválido para Línea Nueva.",
      first?.code ?? "VALIDATION_FAILED",
    );
  }

  const ruleEvaluation = lineaNuevaRuleEngine.evaluate(ctx);

  const builder = new LineaNuevaScriptBuilder(ctx, ruleEvaluation.flags);
  registerLineaNuevaSections({
    ctx,
    flags: ruleEvaluation.flags,
    builder,
  });
  const sections = builder.finish();

  return renderLineaNuevaSections(sections, {
    flowKey: ctx.flowKey,
    flowTitle: ctx.flowTitle,
    variant: ctx.variant,
  });
}

/** Punto de entrada desde gestión comercial (sin lógica en React). */
export function buildLineaNuevaScript(input: LineaNuevaEngineInput): LineaNuevaScriptOutput {
  assertOfficialDocumentAvailable();
  const ctx = buildLineaNuevaScriptContext(input);
  return runLineaNuevaScriptEngine(ctx);
}

export function isLineaNuevaSinEquipoFlow(flowKey: string): boolean {
  return flowKey === LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY;
}

export { LINEA_NUEVA_SIN_EQUIPO_FLOW_KEY, LINEA_NUEVA_SIN_EQUIPO_FLOW_TITLE };
