import { saludoScriptVarsFromLineaNueva } from "../linea-nueva-teleprompter-adapter";
import type { LineaNuevaScriptContext } from "../linea-nueva-types";

export class LineaNuevaBloque09ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "LineaNuevaBloque09ValidationError";
  }
}

/** Mismo criterio Portabilidad `n(ctx)`: `cliente_primer_nombre || nombre_cliente`. */
export function lineaNuevaEncuestaClientFirstName(ctx: LineaNuevaScriptContext): string {
  const vars = saludoScriptVarsFromLineaNueva(ctx);
  return vars.cliente_primer_nombre || vars.nombre_cliente;
}

/** Valida datos mínimos antes de construir el Bloque 9. */
export function assertLineaNuevaBloque09Ready(ctx: LineaNuevaScriptContext): LineaNuevaScriptContext {
  if (!ctx.cliente.nombre.trim()) {
    throw new LineaNuevaBloque09ValidationError(
      "Falta el nombre del cliente para generar el discurso de la encuesta NPS.",
      "MISSING_CLIENT_NAME",
    );
  }

  if (!lineaNuevaEncuestaClientFirstName(ctx).trim()) {
    throw new LineaNuevaBloque09ValidationError(
      "No se pudo resolver el primer nombre del cliente para la encuesta NPS.",
      "MISSING_CLIENT_FIRST_NAME",
    );
  }

  return ctx;
}
